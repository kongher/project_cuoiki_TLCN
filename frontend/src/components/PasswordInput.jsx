import { useState } from 'react'

const EyeIcon = ({ hidden }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.75'
    className='w-5 h-5'
    aria-hidden
  >
    {hidden ? (
      <>
        <path d='M3 3l18 18' strokeLinecap='round' />
        <path d='M10.58 10.58a2 2 0 0 0 2.84 2.84' />
        <path d='M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.6 11.6 0 0 1-1.72 2.91M6.61 6.61A11.33 11.33 0 0 0 1 12.5C2.73 16.89 7 20 12 20a10.94 10.94 0 0 0 2.12-.22' strokeLinecap='round' />
      </>
    ) : (
      <>
        <path d='M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5z' />
        <circle cx='13' cy='12.5' r='3' />
      </>
    )}
  </svg>
)

/** Ô mật khẩu một nút hiện/ẩn */
const PasswordInput = ({
  value,
  onChange,
  placeholder,
  className = '',
  autoComplete,
  minLength,
  required,
  id,
}) => {
  const [show, setShow] = useState(false)

  return (
    <span className='relative block w-full'>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`hide-browser-password-reveal ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button
        type='button'
        tabIndex={-1}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
        className='absolute right-2 top-1/2 z-10 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800'
      >
        <EyeIcon hidden={show} />
      </button>
    </span>
  )
}

export default PasswordInput
