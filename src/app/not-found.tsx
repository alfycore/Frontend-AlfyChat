import Image from 'next/image';
import { HomeIcon, MessageCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-background" />

      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {/* Logo */}
        <Link href="/" className="mb-12 flex items-center gap-2.5 no-underline">
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} />
          <span className="font-[family-name:var(--font-krona)] text-lg text-foreground">AlfyChat</span>
        </Link>

        {/* 404 */}
        <h1 className="mb-3 font-[family-name:var(--font-krona)] bg-[linear-gradient(135deg,oklch(0.7_0.2_280),oklch(0.65_0.25_310),oklch(0.6_0.2_250))] bg-clip-text text-[6rem] leading-none text-transparent md:text-[9rem]">
          404
        </h1>

        <h2 className="mb-3 font-[family-name:var(--font-krona)] text-xl tracking-tight">
          Page introuvable
        </h2>

        <p className="mb-10 max-w-sm text-muted">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg">
              <HomeIcon size={16} />
              Accueil
            </Button>
          </Link>
          <Link href="/channels/me">
            <Button size="lg" variant="outline">
              <MessageCircleIcon size={16} />
              Ouvrir AlfyChat
            </Button>
          </Link>
        </div>
      </div>

      <p className="absolute bottom-6 text-[10px] text-muted/40">
        © 2026 AlfyChat · AlfyCore
      </p>
    </div>
  );
}
