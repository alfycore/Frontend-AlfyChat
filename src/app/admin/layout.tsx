'use client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-background">
      {children}
    </div>
  );
}
