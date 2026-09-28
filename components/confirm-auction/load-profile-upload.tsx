"use client";

import { useRef } from "react";

export const LOAD_PROFILE_ACCEPT = ".xlsx,.xls,.csv,.pdf";
export const LOAD_PROFILE_MAX_BYTES = 10 * 1024 * 1024;

type LoadProfileUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
};

export default function LoadProfileUpload({
  file,
  onChange,
}: LoadProfileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(selected: File | null) {
    if (selected && selected.size > LOAD_PROFILE_MAX_BYTES) {
      alert("Файлът е по-голям от 10 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(selected);
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label htmlFor="load-profile">
        Товаров профил{" "}
        <span className="font-normal text-white-dark">(незадължително)</span>
      </label>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary bg-primary-light p-4 dark:bg-primary-dark-light">
          <div className="min-w-0">
            <div className="truncate font-semibold text-black dark:text-white-light">
              {file.name}
            </div>
            <div className="text-xs text-white-dark">
              {(file.size / 1024).toFixed(0)} KB
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="btn btn-outline-danger btn-sm shrink-0"
          >
            Премахни
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          id="load-profile"
          type="file"
          accept={LOAD_PROFILE_ACCEPT}
          onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
          className="form-input p-0 file:mr-4 file:cursor-pointer file:border-0 file:bg-primary/90 file:px-4 file:py-2 file:font-semibold file:text-white file:hover:bg-primary"
        />
      )}

      <p className="mt-1.5 text-xs text-white-dark">
        {"15-минутни или почасови данни от ЕРП / измервателната система (Excel, CSV или PDF, до 10 MB). С профил търговците дават по-точни оферти."}
      </p>
    </div>
  );
}
