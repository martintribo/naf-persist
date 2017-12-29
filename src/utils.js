export function createNetworkId() {
    return Math.random().toString(36).substring(2, 9);
}

export const componentName = 'naf-persist';

export function getPersistComponent(entity) {
    return entity.components['naf-persist'];
}