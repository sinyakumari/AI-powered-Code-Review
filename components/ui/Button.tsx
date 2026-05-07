import { THEME } from '@/lib/constants';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  type = 'button', 
  loading = false, 
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  size = 'md'
}) => {
  const isOutline = variant === 'outline';
  const isSmall = size === 'sm';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        backgroundColor: isOutline ? 'transparent' : (disabled || loading ? `${THEME.PRIMARY}80` : THEME.PRIMARY),
        border: isOutline ? `1px solid ${THEME.PRIMARY}` : 'none',
        color: isOutline ? THEME.PRIMARY : 'white',
        width: fullWidth ? '100%' : 'auto',
        padding: isSmall ? '6px 12px' : '10px 16px',
        fontSize: isSmall ? '12px' : '14px',
      }}
      className={`rounded font-semibold transition-all duration-200 
        ${disabled || loading 
          ? 'cursor-not-allowed opacity-70' 
          : 'hover:brightness-110 active:transform active:scale-[0.98]'
        } flex items-center justify-center`}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        label
      )}
    </button>
  );
};

export default Button;
