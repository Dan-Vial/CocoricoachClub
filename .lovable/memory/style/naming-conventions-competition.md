---
name: Competition Naming Conventions
description: Replacing 'Matchs' with 'Compétitions' universally; sports individuels n'ont pas de "Phase de compétition" globale (saisie par épreuve)
type: preference
---
- Le terme 'Matchs' est remplacé par 'Compétitions' dans toute l'UI (onglets, sous-menus, libellés).
- Pour les **sports individuels** (athlétisme, ski, surf, tennis, etc.), le champ "Phase de compétition" est **masqué** au niveau création/édition de la compétition (AddMatchCalendarDialog, EditMatchDialog, AddMultipleCompetitionsDialog). La phase est saisie **par épreuve/tour** dans le dialog des manches (CompetitionRoundsDialog).
- En **athlétisme**, chaque épreuve dispose d'un champ **datetime-local** ("Date & heure de l'épreuve") pour planifier finement la journée. La date est tronquée à `YYYY-MM-DD` lors de la synchro vers `athletics_records`.
