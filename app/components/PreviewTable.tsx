'use client'
import { useEffect, useState } from 'react'

interface PreviewTableProps {
  marksData: any[]
  studentData: any[]
}

export default function PreviewTable({ marksData, studentData }: PreviewTableProps) {
  const [previewData, setPreviewData] = useState<any[]>([])

  useEffect(() => {
    if (marksData.length > 0 && studentData.length > 0) {
      const merged = marksData.slice(0, 5).map((mark) => {
        // Try to find student by Arabic or English column names
        const student = studentData.find(
          (s) => 
            s['الاسم المصحح'] === mark['الاسم الكامل'] || 
            s['Corrected Name'] === mark['Full Name'] ||
            s['corrected name'] === mark['full name'] ||
            s['corrected_name'] === mark['full_name']
        )
        return {
          course: mark['المادة'] || mark['Course'] || mark['course'],
          name: mark['الاسم الكامل'] || mark['Full Name'] || mark['full name'] || mark['full_name'],
          total: mark['المجموع'] || mark['Total'] || mark['total'],
          classroom: student?.['الصف'] || student?.['Classroom'] || student?.['classroom'] || 'غير معروف',
        }
      })
      setPreviewData(merged)
    } else if (marksData.length > 0) {
      setPreviewData(
        marksData.slice(0, 5).map((mark) => ({
          course: mark['المادة'] || mark['Course'] || mark['course'],
          name: mark['الاسم الكامل'] || mark['Full Name'] || mark['full name'] || mark['full_name'],
          total: mark['المجموع'] || mark['Total'] || mark['total'],
          classroom: 'لم يتم تحميل بيانات الصف',
        }))
      )
    } else if (studentData.length > 0) {
      setPreviewData(
        studentData.slice(0, 5).map((student) => ({
          course: 'لم يتم تحميل بيانات المادة',
          name: student['الاسم المصحح'] || student['Corrected Name'] || student['corrected name'] || student['corrected_name'],
          total: 'لم يتم تحميل بيانات المجموع',
          classroom: student['الصف'] || student['Classroom'] || student['classroom'],
        }))
      )
    }
  }, [marksData, studentData])

  if (previewData.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      {/* ... rest of the component remains the same ... */}
    </div>
  )
}