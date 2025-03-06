import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    const {
      className = '',
      label,
      helperText,
      error,
      fullWidth = false,
      ...rest
    } = props;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label 
            htmlFor={rest.id} 
            className="block text-sm font-medium text-zinc-200 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          className={`
            flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm
            ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 
            focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed 
            disabled:opacity-50 ${error ? 'border-red-500' : ''} ${className}`
          }
          {...rest}
        />
        
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-zinc-500">{helperText}</p>
        )}
        
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
); 