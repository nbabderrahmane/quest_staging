# Documentation Technique : Système de Récurrence

**Dernière mise à jour** : 27 Janvier 2026

## 1. Vue d'ensemble
Le système de récurrence de Ship Quest permet de générer automatiquement des nouvelles tâches à intervalles réguliers (Quotidien, Hebdomadaire, Mensuel).

Il repose sur trois piliers :
1.  **Configuration SQL** : Colonnes spécifiques dans la table `tasks`.
2.  **API Cron** : Endpoint `/api/cron/recurrence` exécuté périodiquement.
3.  **Job Scheduler** : Vercel Cron (ou un appel externe) qui déclenche l'API.

## 2. Fonctionnement Technique

### A. Structure de Données (Base de Données)
La table `tasks` contient les champs suivants :
- `is_recurring` (boolean) : Active la récurrence.
- `recurrence_rule` (jsonb) : Définit la règle (ex: `{ "frequency": "weekly", "interval": 1, "days": ["Mon"] }`).
- `recurrence_next_date` (timestamptz) : La date cible de la **prochaine** occurrence. C'est ce champ qui déclenche la création.
- `recurrence_end_date` (date) : (Optionnel) Date de fin.
- `parent_recurrence_id` (uuid) : Lien vers la tâche mère (pour les tâches enfant générées).

### B. L'Algorithme de Génération (`/api/cron/recurrence`)
**Important : Les tâches ne sont PAS pré-générées.**
C'est un système "Juste-à-Temps". La prochaine tâche n'existe pas tant que le Cron ne s'est pas exécuté à la date prévue (`recurrence_next_date`).

#### Pourquoi est-ce lié aux Sprints (Quests) ?
Puisque la tâche est créée le jour J (par ex: lundi matin), le système doit décider **dans quel Sprint** la ranger.
1.  Il regarde la date du jour.
2.  Il cherche un Sprint qui couvre cette date.
3.  Si trouvé -> La tâche y est assignée.
4.  Si **pas de sprint actif** (ex: entre deux sprints) -> Le système cherche le **prochain sprint futur** pour l'y assigner par anticipation.

#### Le processus étape par étape :
A chaque exécution (par défaut tous les jours à minuit UTC) :

1.  **Sélection** : Récupère toutes les tâches où `is_recurring = true` ET `recurrence_next_date <= NOW()`.
2.  **Traitement Itératif** : Pour chaque tâche trouvée :
    *   **Calcul de la Date** : Détermine la date prévue (`intendedDate`).
    *   **Calcul du Prochain Cycle** : Met à jour la date pour le *futur* (ex: J+7 pour hebdo) afin de ne pas re-traiter la tâche indéfiniment.
    *   **Recherche de Quest (Sprint)** :
        *   Cherche un Sprint Actif couvrant `intendedDate`.
        *   *Fallback* : Si aucun sprint actif (ex: weekend), cherche le **prochain sprint futur**.
        *   *Fallback Ultime* : Utilise le Quest actuel de la tâche mère.
    *   **Détermination du Statut** : Force la nouvelle tâche en statut **TODO** (ou Backlog), jamais en "Done".
    *   **Clonage** : Crée une nouvelle tâche (Task Enfant) avec les propriétés de la mère.
    *   **Mise à jour Mère** : Met à jour `recurrence_next_date` de la tâche mère.

## 3. Pourquoi ça ne marchait pas ? (Diagnostic et Solutions)

### Problème 1 : Absence de déclencheur (Cron)
**Symptôme** : Aucune tâche créée, même avec des dates passées.
**Cause** : Le fichier `vercel.json` définissant le Cron Job était absent.
**Solution** : Ajout de `vercel.json` avec une schedule quotidienne (`0 0 * * *`).

### Problème 2 : Tâches "invisibles" (Statut Done)
**Symptôme** : Tâche créée mais introuvable dans le Board.
**Cause** : Si la tâche mère était marquée "Done", la copie prenait le même statut.
**Solution** : Force le statut à "Todo" lors de la création.

### Problème 3 : Trous entre les Sprints
**Symptôme** : Récurrence le Dimanche, Sprint fini le Vendredi.
**Cause** : Le système ne trouvait pas de Quest actif à la date donnée et échouait.
**Solution** : Ajout d'une logique "Next Future Quest" qui place la tâche dans le Sprint du Lundi suivant.

## 4. Comment vérifier manuellement ?

Vous pouvez forcer l'exécution du script de récurrence via un appel API (cURL ou Postman) ou via le navigateur si vous êtes connecté en local :

**URL** : `GET /api/cron/recurrence`

**Réponse attendue** :
```json
{
  "processed": 1,
  "details": [
    { "id": "...", "status": "processed", "next_date": "..." }
  ]
}
```

Si `processed` est 0, c'est qu'aucune tâche n'a `recurrence_next_date` dans le passé.
