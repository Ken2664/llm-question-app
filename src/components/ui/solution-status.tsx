import React from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SolutionStatusDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SolutionStatusDialog({ isOpen, onClose }: SolutionStatusDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>解決状態が未選択です</DialogTitle>
          <DialogDescription>
            質問の解決状態（解決済みまたは未解決）を選択してからトップページに戻ってください。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            戻る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

