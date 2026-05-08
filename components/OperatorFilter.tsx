'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Operator } from '@/types/transport'

interface OperatorFilterProps {
  operators: Operator[]
  selected: string
}

export default function OperatorFilter({ operators, selected }: OperatorFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('operator', value)
    } else {
      params.delete('operator')
    }
    router.push(pathname + (params.toString() ? '?' + params.toString() : ''))
  }, [router, pathname, searchParams])

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-4 py-2.5 pr-9 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer"
      >
        <option value="">All Operators</option>
        {operators.map((op) => (
          <option key={op.id} value={op.name}>{op.name}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
