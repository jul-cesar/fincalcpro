"use client"

import ExcelJS from "exceljs"
import { toPng } from "html-to-image"

type KeyValue = {
  label: string
  value: string
}

type TableData = {
  title: string
  headers: string[]
  rows: Array<Array<string | number>>
}

type ExportPayload = {
  fileName: string
  sheetName: string
  moduleTitle: string
  generatedAt: string
  inputs: KeyValue[]
  results: KeyValue[]
  formulas: string[]
  table?: TableData
  imageElements?: HTMLElement[]
}

export async function exportModuleToExcel(payload: ExportPayload) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(payload.sheetName)

  sheet.columns = [{ width: 28 }, { width: 52 }]
  sheet.addRow(["FinCalcPro", payload.moduleTitle])
  sheet.addRow(["Generado", payload.generatedAt])
  sheet.addRow([])

  sheet.addRow(["Entradas", ""])
  for (const item of payload.inputs) {
    sheet.addRow([item.label, item.value])
  }

  sheet.addRow([])
  sheet.addRow(["Resultados", ""])
  for (const item of payload.results) {
    sheet.addRow([item.label, item.value])
  }

  sheet.addRow([])
  sheet.addRow(["Formulas", ""])
  for (const formula of payload.formulas) {
    sheet.addRow([formula, ""])
  }

  if (payload.table) {
    sheet.addRow([])
    sheet.addRow([payload.table.title, ""])
    sheet.addRow(payload.table.headers)
    for (const row of payload.table.rows) {
      sheet.addRow(row)
    }
  }

  const imageElements = payload.imageElements ?? []
  for (const element of imageElements) {
    const png = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    })
    const imageId = workbook.addImage({
      base64: png,
      extension: "png",
    })
    const row = sheet.rowCount + 2
    sheet.addRow([])
    sheet.addRow(["Grafica", ""])
    sheet.addImage(imageId, {
      tl: { col: 0, row },
      ext: { width: 760, height: 280 },
    })
    for (let i = 0; i < 15; i += 1) sheet.addRow([])
  }

  const headerRows = [1, 4]
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const firstCell = row.getCell(1)
    if (["Entradas", "Resultados", "Formulas"].includes(String(firstCell.value ?? ""))) {
      firstCell.font = { bold: true }
    }
  }
  for (const rowNumber of headerRows) {
    const row = sheet.getRow(rowNumber)
    row.font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = payload.fileName.endsWith(".xlsx") ? payload.fileName : `${payload.fileName}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
