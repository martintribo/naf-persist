import { getPersistComponent } from './utils.js';
import { componentName } from './utils.js';

AFRAME.registerSystem('naf-persist', {
    schema: {
        url: {
            default: 'naf-persist',
        },
        fetchNonLocalEntities: {
            default: true
        }, // Might not want to fetch an entity until it is created locally
        
        // If an entity with the same persistId already exists on the server, 
        preferLocalOverRemote: {
            'default': false
        },

        // Sometimes you might not want to load an entity unless it has a local version
        loadNonExisting: {
            'default': true
        },

        // persistIds can be generated by the location in the dom this has caveats in that
        // radically changing the dom will alter the id, but makes for easy debugging an entity between loads
        identifyByDom: {
            'default': false
        },

        // If the entity has the networked component, and not a persistId, use the networkId
        // This might mean the persist system needs to wait on the networked component to recieve an ID
        useNafId: {
            'default': true
        },

        // If true, will check that NAF does not contain an entity with the same persistId
        checkNafBeforeFetch: {
            default: true
        },

        // Note: When using NAF, behavior might be modified-
        // Wait until NAF syncs entities from other clients, as they might have persistId
        // Possibly patch NAF to supply persistId when it syncs entities
        // OR: Can save NAF parameters. Waiting on NAF to sync these
        // NOTE: I don't think there was a good way to know when NAF was done with this
        // Probably just wait on a timeout.
        // This can be a local thing that only activates when a NAF id is attached to the entity
        // How does this behavior work with the persist settings above?
        // NAF compatibility can be accomplished without special behavior by using an initial wait and preferLocalOverRemote as false

        // TODO: Use NAF networkId when available?

        // How long the plugin waits (in ms) before syncing with the db
        initialWait: {
            default: 0
        },
        updateRate: { default: 1000 }
    },
    init: function () {
        this.pouchdb = new PouchDB(this.data.url);
        this.entities = [];
        this.entitiesMap = {};
        this.nextSyncTime = Date.now() + this.data.updateRate;
        this.play();
    },
    tick: function () {
        if (this.nextSyncTime <= Date.now()) {
            this.persistUpdatedEntities();
            this.nextSyncTime = Date.now() + this.data.updateRate;
        }
    },
    register: function (comp) {
        const entity = comp.el;
        this.entities.push(entity);
        this.entitiesMap[comp.data.persistId] = {
            'entity': entity,
            'serializedDoc': null
        };
        if (!comp.data.persisted) {
            this.persist(entity);
        }
    },
    persist: function (entity) {
        console.log("persist");
        const comp = getPersistComponent(entity);
        const json = {
            'serialization': this.serialize(entity),
            '_id': comp.data.persistId
        };
        this.entitiesMap[comp.data.persistId]['serializedDoc'] = json['serialization'];
        this.pouchdb.get(comp.data.persistId).then(doc => {
            json['_rev'] = doc['_rev'];
        }).catch(e => {}).then(() => {
            return this.pouchdb.put(json);
        }).then(function () {
            // TODO: What if entity has been removed?
            entity.setAttribute(componentName, 'persisted', true);
            console.log("persist finish");
        }).catch(function () {
            console.log("persist error");
        });
    },
    
    play: function () {
        // setTimeout(() => {
            this.pouchdb.allDocs().then(result => {
                const ids = result.rows
                    // .filter(row => (this.entitiesMap[row.id] == null))
                    .map(row => row.id);
                
                return this.pouchdb.allDocs({
                    'keys': ids,
                    'include_docs': true
                });
            }).then(results => {
                results.rows.forEach(row => this.deserialize(row.doc));
            });
        // }, 1000);
    },

    serialize: function (el) {
        const attributes = {};
        el.getAttributeNames().forEach(name => {
            attributes[name] = el.getAttribute(name);
        });

        return {
            'tagName': el.tagName,
            'components': attributes
        };
        
        // const comp = getPersistComponent(el);
        // const html = el.outerHTML;
        // return {
        //     '_id': comp.data.persistId,
        //     'html': html
        // };
    },
    deserialize: function (serializedDoc) {
        // var parser = new DOMParser();
        // var doc = parser.parseFromString(serializedDoc['html'], 'text/xml');
        // var element = doc.firstChild;
        // var template = document.createElement('template');
        // template.innerHTML = serializedDoc['html'];
        // var element = template.content.firstChild;
        // element.setAttribute(componentName, 'persistId: ' + serializedDoc['_id']);
        // var elements = doc.childNodes;
        // return elements;

        var persistId = serializedDoc['_id'];
        var elementInfo = serializedDoc['serialization'];

        var element;
        var needToAppend = false;
        if (this.entitiesMap[persistId] != null) {
            element = this.entitiesMap[persistId]['entity'];
        } else {
            element = document.createElement(elementInfo['tagName']);
            needToAppend = true;
        }
        
        Object.keys(elementInfo['components']).forEach(name => {
            element.setAttribute(name, elementInfo['components'][name]);
        });

        if (needToAppend) {
            document.querySelector('a-scene').appendChild(element);
        }
    },

    persistUpdatedEntities: function () {
        this.entities.forEach(entity => {
            if (this.entityNeedsUpdate(entity)) {
                this.persist(entity);
            }
        });
    },

    entityNeedsUpdate: function (entity) {
        const comp = getPersistComponent(entity);
        const serialized = this.serialize(entity);
        const oldSerialized = this.entitiesMap[comp.data.persistId]['serializedDoc'];
        return JSON.stringify(serialized) !== JSON.stringify(oldSerialized);

        // const oldHtml = oldSerialized != null ? oldSerialized['html'] : null;
        // return serialized['html'] !== oldHtml;
    }
});