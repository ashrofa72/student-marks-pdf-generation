'use client'
import { useCallback } from 'react'
import Papa from 'papaparse'
import { useDropzone } from 'react-dropzone'
import { FiUploadCloud } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import styles from './FileUpload.module.css'

interface FileUploadProps {
  title: string
  description: string
  onUpload: (data: any[]) => void
}

export default function FileUpload({ title, description, onUpload }: FileUploadProps) {
  const parseExcel = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            onUpload(results.data)
          },
          skipEmptyLines: true,
        })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const excelData = await parseExcel(file)
        onUpload(excelData as any[])
      }
    } catch (error) {
      console.error('Error parsing file:', error)
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  })

  return (
    <div className={styles.uploadContainer} {...getRootProps()}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-2">
        <FiUploadCloud className={styles.uploadIcon} />
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <p className="text-xs text-gray-500">CSV أو Excel</p>
      </div>
    </div>
  )
}