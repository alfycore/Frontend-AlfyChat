import Link from 'next/link';

const DOCS: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    updated: '1 juillet 2026',
    sections: [
      { h: '1. Objet', p: "Les présentes conditions régissent l'utilisation d'AlfyChat, service de messagerie chiffrée édité en France." },
      { h: '2. Compte', p: "La création d'un compte ne requiert aucun numéro de téléphone. Vous êtes responsable de la confidentialité de vos identifiants et de vos clés de chiffrement." },
      { h: '3. Contenu', p: "Vous restez propriétaire de vos contenus. Chiffrés de bout en bout, ils ne sont ni lus ni exploités par l'éditeur." },
      { h: '4. Modération', p: "Les communautés définissent leurs propres règles. L'éditeur intervient uniquement sur signalement de contenus manifestement illicites non chiffrés." },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    updated: '1 juillet 2026',
    sections: [
      { h: 'Données collectées', p: "Le strict minimum : identifiant, email de récupération (facultatif) et métadonnées techniques nécessaires au service." },
      { h: 'Chiffrement', p: "Le contenu de vos messages privés est chiffré de bout en bout. Nous ne détenons pas les clés et ne pouvons donc pas y accéder." },
      { h: 'Hébergement', p: "Les données sont hébergées en France, conformément au RGPD. Vous pouvez les exporter ou demander leur suppression à tout moment." },
      { h: 'Aucune revente', p: "Aucune donnée n'est vendue ni utilisée à des fins publicitaires. Le modèle économique repose sur l'hébergement, pas sur vos données." },
    ],
  },
  mentions: {
    title: 'Mentions légales',
    updated: '1 juillet 2026',
    sections: [
      { h: 'Éditeur', p: 'AlfyChat SAS, société immatriculée en France. Directeur de la publication : Karlo H.' },
      { h: 'Hébergement', p: 'Serveurs situés en France. Contact : legal@alfy.chat.' },
      { h: 'Propriété intellectuelle', p: "Le code d'AlfyChat est open source et publié sous licence libre. La marque et les logos restent la propriété de l'éditeur." },
    ],
  },
  cookies: {
    title: 'Gestion des cookies',
    updated: '1 juillet 2026',
    sections: [
      { h: 'Cookies essentiels', p: "Seuls des cookies strictement nécessaires au fonctionnement (session, préférences de thème) sont utilisés." },
      { h: 'Aucun traceur', p: "Aucun cookie publicitaire ni traceur tiers. Pas de bannière anxiogène : il n'y a rien à accepter." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export default async function UitestLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug] ?? DOCS.mentions;
  return (
    <div className="h-full overflow-y-auto bg-background">
      <article className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/uitest/landing" className="text-xs text-muted hover:text-accent">← Retour</Link>
        <h1 className="mt-3 font-heading text-2xl font-bold">{doc.title}</h1>
        <p className="mt-1 text-xs text-muted">Dernière mise à jour : {doc.updated}</p>
        <div className="mt-8 flex flex-col gap-6">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-base font-semibold">{s.h}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
