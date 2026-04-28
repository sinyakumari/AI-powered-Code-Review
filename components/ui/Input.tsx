import { THEME } from '@/lib/constants';

interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon
}) => {
  return (
    <div className="w-full mb-3 text-left">
      <label 
        style={{ color: THEME.TEXT_MUTED }}
        className="block text-xs font-medium mb-1"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ 
            backgroundColor: THEME.BACKGROUND,
            borderColor: error ? '#ffb4ab' : THEME.BORDER,
            color: THEME.TEXT
          }}
          className={`w-full ${icon ? 'pl-11' : 'px-4'} py-2.5 rounded border outline-none transition-all duration-200 
            ${error 
              ? 'focus:ring-2 focus:ring-red-500/20' 
              : 'focus:border-[#6d5bff] focus:ring-2 focus:ring-[#6d5bff]/20'
            }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
