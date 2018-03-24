import { createNetworkId } from './utils.js';
import { componentName } from './utils.js';

AFRAME.registerComponent(componentName, {
    dependencies: ['networked'],
    schema: {
        persisted: {
            default: false
        },
        // persistId is generated if one is not supplied
        // If an id is provided, and an entity exists in the db,
        // That entity's remote config will be ported to the local config
        persistId: {
            default: '',
            type: 'string'
        }
    },
    init: function () {
        const networked = this.el.components['networked'];
        if (networked != null && this.system.data.useNafId) {
            this.el.setAttribute(componentName, 'persistId', networked.data.networkId);
        }
        if (this.data.persistId == null || this.data.persistId === '') {
            this.el.setAttribute(componentName, 'persistId', createNetworkId());
            // this.updateSchema();
        }
        // if (networked != null) {
        //     if (!this.wasCreatedByNetwork()) {
        //     }
        // } else {
        //     this.system.addLocalEntity(this);
        // }

        this.system.register(this);
    },
    serialize: function () {

    },
    remove: function () {
        this.system.remove(this);
    }
});