import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { marksData, studentData } = await request.json()

    // Validate input
    if (!marksData || !studentData) {
      return NextResponse.json(
        { error: 'البيانات المطلوبة غير موجودة' },
        { status: 400 }
      )
    }

    // Clean and normalize data
    const cleanMarksData = marksData
      .filter((row: any) => row && (row['الاسم الكامل'] || row['Full Name']))
      .map((row: any) => ({
        course: row['المادة'] || row['Course'] || row['course'] || 'غير معروف',
        name: row['الاسم الكامل'] || row['Full Name'] || row['full name'] || row['full_name'] || 'غير معروف',
        total: parseTotal(row['المجموع'] || row['Total'] || row['total']),
      }))

    const cleanStudentData = studentData
      .filter((row: any) => row && (row['الاسم المصحح'] || row['Corrected Name']))
      .map((row: any) => ({
        correctedName: row['الاسم المصحح'] || row['Corrected Name'] || row['corrected name'] || row['corrected_name'],
        classroom: row['الصف'] || row['Classroom'] || row['classroom'] || 'غير معروف',
      }))

    if (cleanMarksData.length === 0 || cleanStudentData.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد بيانات صالحة في الملفات المرفوعة' },
        { status: 400 }
      )
    }

    // Merge data with serial numbers
    let mergedData = cleanMarksData.map((mark: { course: string; name: string; total: number }, index: number): { serial: number; course: string; name: string; total: number; classroom: string } => {
      const student = cleanStudentData.find(
        (s: { correctedName: string }) => normalizeArabic(s.correctedName) === normalizeArabic(mark.name)
      )
      return {
        serial: index + 1,
        ...mark,
        classroom: student?.classroom || 'غير معروف',
      }
    }).sort((a: { classroom: string }, b: { classroom: string }) => a.classroom.localeCompare(b.classroom, 'ar'))

    // Create PDF with RTL layout
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    // Load Arabic font
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Tajawal-Regular.ttf')
    const fontBytes = fs.readFileSync(fontPath)
    const arabicFont = await pdfDoc.embedFont(fontBytes, { subset: true })

    // Page setup
    const pageWidth = 595
    const pageHeight = 842
    let page = pdfDoc.addPage([pageWidth, pageHeight])
    
    // Layout constants
    const margin = 40
    const safeMargin = 50 // Additional safety margin for borders
    const headerHeight = 80
    const rowHeight = 25
    const cellPadding = 5
    
    // Define columns in RTL order (serial number on the right)
    const columns = [
      { title: 'الصف', key: 'classroom', width: 60 },
      { title: 'الدرجة', key: 'total', width: 60 },
      { title: 'الاسم', key: 'name', width: 270 },
      { title: 'المادة', key: 'course', width: 130 },
      { title: 'م', key: 'serial', width: 30 } // Serial number column now on the right
    ]
    
    // Calculate table width and starting position (right-aligned)
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0)
    const startX = Math.max(pageWidth - margin - tableWidth, safeMargin) // Ensure we don't exceed left margin
    let currentY = pageHeight - margin - headerHeight

    // Add title (right-aligned)
    const title = 'تقارير نتائج الطلاب'
    const titleWidth = arabicFont.widthOfTextAtSize(title, 20)
    page.drawText(title, {
      x: Math.min(pageWidth - margin - titleWidth, pageWidth - safeMargin - titleWidth), // Ensure within right margin
      y: currentY + 20,
      size: 20,
      font: arabicFont,
      color: rgb(0, 0, 0),
    })

    // Add date (left-aligned)
    const dateText = `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`
    page.drawText(dateText, {
      x: Math.max(margin, safeMargin), // Ensure within left margin
      y: currentY + 10,
      size: 12,
      font: arabicFont,
      color: rgb(0, 0, 0),
    })

    currentY -= 40

    // Verify table fits within page
    if (startX + tableWidth > pageWidth - safeMargin) {
      // Adjust column widths if table is too wide
      columns[2].width = Math.max(150, columns[2].width - (startX + tableWidth - (pageWidth - safeMargin)))
    }

    // Draw table headers with borders (RTL)
    let currentX = startX
    columns.forEach(col => {
      // Draw cell border
      page.drawRectangle({
        x: currentX,
        y: currentY - rowHeight,
        width: col.width,
        height: rowHeight,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0),
      })
      
      // Center text in cell
      const textWidth = arabicFont.widthOfTextAtSize(col.title, 12)
      page.drawText(col.title, {
        x: currentX + (col.width - textWidth) / 2,
        y: currentY - 20,
        size: 12,
        font: arabicFont,
        color: rgb(0, 0, 0),
      })
      
      currentX += col.width
    })

    currentY -= rowHeight

    // Draw student data rows (RTL)
    let currentClassroom = ''
    mergedData.forEach((student: { serial: number; course: string; name: string; total: number; classroom: string }) => {
      // Check for page break
      if (currentY < margin + rowHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        currentY = pageHeight - margin
      }

      // Add classroom header if changed
      if (student.classroom !== currentClassroom) {
        currentY -= rowHeight
        
        // Draw classroom header background
        page.drawRectangle({
          x: startX,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.9, 0.9, 0.9),
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        })
        
        const classroomText = `الصف: ${student.classroom}`
        const textWidth = arabicFont.widthOfTextAtSize(classroomText, 12)
        page.drawText(classroomText, {
          x: startX + (tableWidth - textWidth) / 2,
          y: currentY - 20,
          size: 12,
          font: arabicFont,
          color: rgb(0, 0, 0),
        })
        
        currentClassroom = student.classroom
        currentY -= rowHeight
      }

      // Draw row cells (RTL)
      currentX = startX
      columns.forEach(col => {
        // Draw cell border
        page.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: col.width,
          height: rowHeight,
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        })
        
        // Get cell value
        const cellValue = String(student[col.key as keyof typeof student])
        
        // Center text in cell
        const textWidth = arabicFont.widthOfTextAtSize(cellValue, 10)
        page.drawText(cellValue, {
          x: currentX + (col.width - textWidth) / 2,
          y: currentY - 20,
          size: 10,
          font: arabicFont,
          color: rgb(0, 0, 0),
        })
        
        currentX += col.width
      })

      currentY -= rowHeight
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=student_reports.pdf',
      },
    })

  } catch (error) {
    console.error('خطأ في إنشاء PDF:', error)
    return NextResponse.json(
      { 
        error: 'فشل إنشاء ملف PDF',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function parseTotal(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/,/g, '').split('-')[0])
    return isNaN(num) ? 0 : num
  }
  return 0
}

function normalizeArabic(text: string): string {
  if (!text) return ''
  return text
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ئءؤ]/g, 'ء')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}