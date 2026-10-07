import { useId, useState, type DragEvent } from "react";
import { FileText, ImageIcon, Upload, X } from "lucide-react";

import { validateContractFile } from "@/features/contracts/api/contract-service";
import { formatBytes } from "@/features/contracts/utils/contract-status";
import { cn } from "@/lib/utils";

interface ContractFilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function ContractFilePicker({ files, onChange, disabled }: ContractFilePickerProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(incoming)) {
      const invalid = validateContractFile(file);
      if (invalid) rejected.push(invalid);
      else if (!files.some((f) => f.name === file.name && f.size === file.size)) accepted.push(file);
    }
    setErrors(rejected);
    if (accepted.length > 0) onChange([...files, ...accepted]);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
          dragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload className="size-5" />
        <span>
          Arraste as fotos/PDFs do WhatsApp Web aqui ou <span className="text-primary">clique para escolher</span>
        </span>
        <span className="text-xs">PDF, JPG, PNG ou WEBP — até 10 MB cada</span>
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        accept=".pdf,image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {errors.length > 0 ? (
        <ul className="space-y-1 text-sm text-destructive">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2 px-3 py-2">
              {file.type.startsWith("image/") ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              <button
                type="button"
                aria-label={`Remover ${file.name}`}
                className="opacity-60 hover:opacity-100"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
