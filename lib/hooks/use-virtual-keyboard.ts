'use client'

import { useEffect, useState } from 'react'

interface VirtualKeyboardState {
  isOpen: boolean
  offset: number
}

const OPEN_THRESHOLD_PX = 120

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({ isOpen: false, offset: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      const isOpen = offset > OPEN_THRESHOLD_PX
      setState((prev) =>
        prev.isOpen === isOpen && Math.abs(prev.offset - offset) < 4 ? prev : { isOpen, offset },
      )
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
