/**
 * Preview du redesign HeroUI (importé du prototype newui).
 * Force le thème sombre sur cette route, indépendamment de next-themes,
 * pour visualiser la nouvelle UI telle qu'elle a été conçue.
 */
export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark h-dvh overflow-hidden bg-background text-foreground">{children}</div>;
}
