import * as XLSX from 'xlsx'

export interface ParsedAccountLine {
  accountCode: string
  accountName: string
  amount: number
  analyticalAxis?: string
}

export function parseExcelFile(buffer: Buffer, source: 'BOARD_COM' | 'SAGE_X3'): ParsedAccountLine[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  if (source === 'BOARD_COM') {
    return parseBoardCom(data)
  } else {
    return parseSageX3(data)
  }
}

function parseBoardCom(data: Record<string, unknown>[]): ParsedAccountLine[] {
  return data.map((row) => ({
    accountCode: String(row['Account'] || row['Compte'] || row['Code'] || ''),
    accountName: String(row['Description'] || row['Libellé'] || row['Name'] || ''),
    amount: parseFloat(String(row['Amount'] || row['Montant'] || row['Solde'] || 0)),
    analyticalAxis: row['Cost Center'] ? String(row['Cost Center']) : row['Centre'] ? String(row['Centre']) : undefined,
  })).filter((line) => line.accountCode !== '' && !isNaN(line.amount))
}

function parseSageX3(data: Record<string, unknown>[]): ParsedAccountLine[] {
  return data.map((row) => ({
    accountCode: String(row['ACCOUNT'] || row['CPT'] || row['Compte'] || ''),
    accountName: String(row['LABEL'] || row['LIB'] || row['Libellé'] || ''),
    amount: parseFloat(String(row['BALANCE'] || row['SOLDE'] || row['Montant'] || 0)),
    analyticalAxis: row['CCE'] ? String(row['CCE']) : row['AXE'] ? String(row['AXE']) : undefined,
  })).filter((line) => line.accountCode !== '' && !isNaN(line.amount))
}
