# Core DB schema snapshot (information_schema)

Снимок колонок для ключевых таблиц, полученный из `information_schema.columns`.

## roles
- id
- name
- description
- priority
- keycloak_id
- keycloak_name
- is_active
- is_system
- synced_at
- createdAt
- updatedAt

## users
- id
- login
- password
- role
- name
- surname
- img
- roleId
- teamId
- sectionId
- createdAt
- updatedAt

## production_sections
- id
- title
- description
- managerId
- createdAt
- updatedAt

## production_teams
- id
- title
- productionSectionId
- teamLeadId
- createdAt
- updatedAt

## sessions
- id
- online
- userId
- createdAt
- updatedAt

## PCs
- id
- ip
- pc_name
- cabinet
- createdAt
- updatedAt
