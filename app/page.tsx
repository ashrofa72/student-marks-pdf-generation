'use client'
import { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import FileUpload from './components/FileUpload'
import styles from './components/FileUpload.module.css'

export default function Home() {
  const [marksData, setMarksData] = useState<any[]>([])
  const [studentData, setStudentData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleMarksUpload = (data: any[]) => {
    setMarksData(data)
    toast.success('تم تحميل بيانات العلامات بنجاح')
  }

  const handleStudentUpload = (data: any[]) => {
    setStudentData(data)
    toast.success('تم تحميل بيانات الطلاب بنجاح')
  }

  const mergeData = async () => {
    if (marksData.length === 0 || studentData.length === 0) {
      toast.error('الرجاء تحميل كلا الملفين قبل الدمج')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marksData, studentData }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'student_reports.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()

      toast.success('تم إنشاء ملف PDF بنجاح!')
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء ملف PDF')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">نظام إشعارات نتائج الطلاب</h1>
        <p className="text-lg text-gray-600">
          قم بتحميل ملفات البيانات لإنشاء تقارير PDF للطلاب
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <FileUpload
          title="تحميل بيانات العلامات"
          description="يجب أن يحتوي الملف على: المادة، الاسم الكامل، المجموع"
          onUpload={handleMarksUpload}
        />
        <FileUpload
          title="تحميل بيانات الطلاب"
          description="يجب أن يحتوي الملف على: الاسم المصحح، الصف"
          onUpload={handleStudentUpload}
        />
      </div>

      {(marksData.length > 0 || studentData.length > 0) && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            معاينة البيانات
          </h2>
          <div className="overflow-x-auto">
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الاسم الكامل</th>
                  <th>الدرجة</th>
                  <th>الصف</th>
                </tr>
              </thead>
              <tbody>
                {[...marksData.slice(0, 5), ...studentData.slice(0, 5)].map((row, index) => (
                  <tr key={index}>
                    <td>{row['المادة'] || row['Course'] || 'N/A'}</td>
                    <td>{row['الاسم الكامل'] || row['Full Name'] || 'N/A'}</td>
                    <td>{row['الدرجة'] || row['Total'] || 'N/A'}</td>
                    <td>{row['الصف'] || row['Classroom'] || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center text-sm text-gray-500 mt-2">
            عرض أول 5 سجلات فقط للمعاينة
          </div>
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button
          onClick={mergeData}
          disabled={isProcessing || marksData.length === 0 || studentData.length === 0}
          className={styles.generateButton}
        >
          {isProcessing ? 'جاري الإنشاء...' : 'إنشاء ملف PDF'}
        </button>
      </div>

      <ToastContainer 
        position="bottom-left" 
        rtl={true} 
        toastClassName="font-sans"
        progressClassName="bg-blue-500"
      />
    </div>
  )
}