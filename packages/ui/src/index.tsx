import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva('button', {
  variants: {
    variant: { default: 'button-primary', outline: 'button-outline', ghost: 'button-ghost' },
  },
  defaultVariants: { variant: 'default' },
});
export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  wide = false,
  initialFocusRef,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={cn('dialog-content', wide && 'dialog-wide')}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
        >
          <header>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" aria-label="Fechar">
                <X size={18} />
              </Button>
            </DialogPrimitive.Close>
          </header>
          <DialogPrimitive.Description className="sr-only">
            Preencha as informações e revise antes de salvar.
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Badge({ value }: { value: string }) {
  const tone = ['OPERACIONAL', 'ATENDE', 'VIGENTE', 'CONCLUIDA', 'CONCLUIDO'].includes(value)
    ? 'success'
    : ['DIVERGENCIA', 'COM_PROBLEMA', 'INDISPONIVEL'].includes(value)
      ? 'danger'
      : 'warning';
  return (
    <span className={`badge badge-${tone}`}>
      <span /> {value.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}
