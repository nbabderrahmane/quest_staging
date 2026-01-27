# PRD v2: État des Lieux & Socle Existant
**Version**: 2.0 (Current State)
**Date**: 2026-01-27
**Status**: LIVE / STABLE
**Target Audience**: Product Team, Stakeholders

---

## 1. Vision & Proposition de Valeur
**Ship Quest** est une plateforme de gestion de projet **gamifiée** conçue pour les équipes agiles à haute vélocité. Elle remplace les outils administratifs ennuyeux par une interface immersive ("Retro Sci-Fi") qui engage les employés.

### Les 3 Piliers :
1.  **Gamification (XP & Bosses)** : Chaque tâche rapporte de l'XP. Chaque Sprint (Quest) est un combat contre un "Boss" (Nemesis). La productivité fait baisser la barre de vie du Boss.
2.  **Focus Radical ("My Work")** : Une vue dédiée pour l'employé qui sépare le signal du bruit. Matrice d'Eisenhower intégrée pour prioriser l'exécution.
3.  **Communication Unifiée (Inbox)** : Un flux unique pour les tâches, les commentaires et les alertes de deadline, évitant la fatigue des emails.

---

## 2. Cartographie des Personas

| Persona | Rôle Système | Objectifs Clés |
| :--- | :--- | :--- |
| **Le Commandant** | `Owner`, `Admin` | Configurer le système ("The Forge"), créer les Sprints ("Quests"), gérer les équipes ("Crew"). |
| **Le Tacticien** | `Manager` | Assigner les tâches, débloquer les équipes, suivre l'avancement via les Dashboards. |
| **L'Éclaireur** | `Member` | Exécuter les tâches, gagner de l'XP, signaler les blocages. |
| **Le Client** | `Client` | (Via Portal) Créer des tickets, valider les livrables, suivre l'avancement sans accès au cœur. |

---

## 3. Inventaire des Fonctionnalités (Core Features)

### A. Le QG (Dashboard & Organisation)
*   **Multi-Tenancy** : Supporte plusieurs Organisations (Teams) et Sous-équipes (Squads).
*   **The Forge (Admin)** : Configuration complète des protocoles (Statuts Kanban, Tailles XP S/M/L, Matrices d'Urgence).
*   **Gestion des Membres** : Invitation et gestion des rôles (RBAC strict).

### B. Gestion de Projet (Quests & Tasks)
*   **Quest Board** : Tableau Kanban temps-réel avec Drag & Drop.
    *   *Feature Clé* : Barre de vie du Boss qui descend à chaque tâche terminée.
    *   *Nouveau* : Badges visuels pour les tâches récurrentes.
*   **Quest Prep** : Module de planification de capacité. Calcule la charge de l'équipe (XP total vs Capacité historique) avant de lancer un sprint.
*   **Récurrence (Cron)** : Moteur de tâches récurrentes "Just-in-Time" (création automatique le jour J dans le bon sprint).

### C. Exécution Individuelle (My Work)
*   **Matrice de Priorité** : Vue personnelle divisée en "NOW" (Focus immédiat), "NEXT" (À venir) et "WAITING" (Bloqué).
*   **Start/Stop** : Workflow simplifié pour démarrer une mission ou signaler un blocage.
*   **WIP Limits** : Alertes visuelles si un utilisateur a trop de tâches en cours simultanément.

### D. Communication & Alertes
*   **Inbox Unifiée** : Centre de notification central. Agrège :
    *   Nouvelles assignations.
    *   Commentaires sur les tâches.
    *   Alertes de Deadline (avant échéance et retard).
*   **Notification Bell** : Synchronisée avec l'Inbox pour un accès rapide n'importe où.

### E. Reporting & Analytics
*   **Analytics** : Graphiques de vélocité et répartition de l'effort.
*   **Reporting CSV** : Export des données filtrable par date ou **par Sprint** (Feature récente requise par la QA).

### F. Portail Client (Client Portal)
*   **Access** : Interface séparée (`/portal`) sécurisée pour les clients externes.
*   **Ticketing** : Les clients peuvent soumettre des demandes qui atterrissent dans le backlog de l'équipe.

---

## 4. Parcours Utilisateurs (User Journeys)

### Parcours 1 : Le cycle de vie d'un Sprint (Manager)
1.  **Setup** : Le Manager va dans `Quest Factory`, crée une "Quest" (ex: "Sprint Janvier"), choisit un "Boss" (Skin visuel) et définit les dates.
2.  **Planification** : Il va dans `Quest Prep`, sélectionne des tâches du Backlog jusqu'à atteindre la capacité de l'équipe (barre de progression XP). Il clique sur "Launch Sprint".
3.  **Suivi** : Durant le sprint, il suit la `Boss Health Bar` sur le Dashboard.
4.  **Clôture** : À la fin, il génère un rapport CSV via `Reporting > By Sprint`.

### Parcours 2 : L'exécution quotidienne (Membre)
1.  **Réveil** : L'employé se connecte. Il voit la **Cloche** rouge.
2.  **Triage** : Il ouvre l'**Inbox**. Il voit "Assignment: Fix Login Bug" et "Deadline Warning: API Doc". Il marque le warning comme "Lu".
3.  **Focus** : Il va dans **My Work**. Il déplace "Fix Login Bug" dans la colonne "NOW".
4.  **Action** : Il travaille. Une fois fini, il clique sur "Complete".
5.  **Récompense** : Une animation de Confettis se déclenche, l'XP de l'équipe augmente.

### Parcours 3 : La boucle de feedback (Client)
1.  **Demande** : Le client se connecte au Portail. Il crée un ticket "Logo trop petit".
2.  **Réception** : L'équipe voit le ticket dans l'Inbox ou le Backlog.
3.  **Traitement** : Le ticket est converti en Tâche, assigné et traité.
4.  **Notification** : Le client voit le statut du ticket passer à "Done" sur son portail.

---

## 5. Zones de Friction & Opportunités (Pour Roadmap v3)

*   **Performance Reviews** : *Note technique : Le code existe partiellement ou est manquant, c'est une zone d'ombre à clarifier.*
*   **Mobile** : L'interface est responsive mais dense. Une application mobile "Compagnon" pour l'Inbox serait un plus.
*   **Social** : Pas de Leaderboard ou de comparaison entre membres (demande fréquente pour la gamification).
*   **IA** : Pas d'assistance intelligente pour le triage ou la rédaction de tickets pour l'instant.

---

*Ce document sert de référence technique et fonctionnelle pour l'élaboration de la future stratégie produit.*
