# Plan de Correction: Infrastructure UI & Notifications

Je ne trouve pas les fichiers liés aux modules "Performance" ou "Cycle de Feedback" dans l'environnement actuel (peut-être sur une branche différente ?).

Cependant, voici le plan technique pour corriger les 3 problèmes signalés.

## 1. Persistance du Sous-menu (Layout vs Page)

**Problème** : Le sous-menu (Tabulation) disparaît quand on navigue vers une sous-page (ex: détail d'une évaluation).
**Cause** : Les onglets (`<Tabs>`) sont probablement définis dans `page.tsx`. Lorsqu'on navigue vers une autre page, Next.js "démonte" le composant `page.tsx` parent.
**Solution** : Il faut déplacer la navigation dans un fichier `layout.tsx`.

### Structure de fichiers recommandée :
```
/src/app/(dashboard)/admin/performance/
├── layout.tsx       <-- Placer les Tabs ICI
├── page.tsx         <-- Redirige vers l'onglet par défaut
├── feedback/        <-- Contenu de l'onglet Feedback
│   └── page.tsx
├── evaluations/     <-- Contenu de l'onglet Evaluations
│   └── page.tsx
└── cycle/[id]/      <-- Page de détail (le layout restera visible au-dessus)
    └── page.tsx
```

## 2. Redirection Aléatoire (State vs URL)

**Problème** : En revenant d'une page, on perd l'onglet actif.
**Cause** : L'état de l'onglet actif est géré par un `useState` React (`const [tab, setTab] = useState(...)`). Cet état est perdu au rafraîchissement ou à la navigation.
**Solution** : Utiliser l'URL comme source de vérité.

### Exemple de correction (`layout.tsx`) :
```tsx
// Utiliser usePathname pour savoir quel onglet est actif
const pathname = usePathname()
const currentTab = pathname.split('/').pop() // ou logique plus robuste

return (
  <Tabs value={currentTab}>
    <TabsList>
       <Link href="/admin/performance/feedback"><TabsTrigger value="feedback">Feedback</TabsTrigger></Link>
       <Link href="/admin/performance/evaluations"><TabsTrigger value="evaluations">Evaluations</TabsTrigger></Link>
    </TabsList>
    {children}
  </Tabs>
)
```

## 3. Notification Fantôme

**Problème** : Badge rouge alors qu'il n'y a rien.
**Cause probable** : La requête SQL qui compte les items ne filtre pas correctement par `team_id` ou compte des éléments "brouillon/draft" comme des notifications.
**Vérification** :
Si le badge est généré via `getUnreadCount`, vérifiez la clause `.eq('is_read', false)`.
Si c'est un module custom, vérifiez que vous filtrez bien :
```sql
-- EXEMPLE DE CORRECTION SQL
SELECT count(*) 
FROM feedback_cycles 
WHERE team_id = current_team_id 
AND status = 'active' -- Ne pas compter les drafts !
AND end_date < NOW()  -- Exemple de condition d'alerte
```

---
**Action Requise** :
Pouvez-vous m'indiquer le chemin précis des fichiers (ex: `src/app/...`) ou copier le code de la page concernée ? Je pourrai alors appliquer ces correctifs directement.
