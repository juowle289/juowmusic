import { Outlet } from 'react-router-dom';

/** Layout for login/signup — no site header, no global audio player. */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#efeff1]">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Outlet />
      </div>
    </div>
  );
}
