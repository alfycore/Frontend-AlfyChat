import Image from 'next/image';
import { HomeIcon, MessageCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      {/* Primary glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-105 w-150 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[100px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-background" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        {/* Logo */}
        <Link href="/" className="mb-10 flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100">
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={24} height={24} />
          <span className="font-heading text-base text-foreground">AlfyChat</span>
        </Link>

        {/* Badge */}
        <div className="mb-5 flex items-center justify-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
          <span className="font-mono text-[11px] font-semibold text-primary">404</span>
        </div>

        {/* Heading */}
        <h1 className="mb-3 font-heading text-3xl tracking-tight text-foreground md:text-4xl">
          Page introuvable
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        <Separator className="mb-8 opacity-30" />

        {/* Actions */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <HomeIcon size={15} />
              Accueil
            </Button>
          </Link>
          <Link href="/channels/me">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <MessageCircleIcon size={15} />
              Ouvrir AlfyChat
            </Button>
          </Link>
        </div>
      </div>

      <p className="absolute bottom-5 font-mono text-[10px] text-muted-foreground/30">
        © 2026 AlfyChat · AlfyCore
      </p>
    </div>
  );
}

