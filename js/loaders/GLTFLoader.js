// js/loaders/GLTFLoader.js
THREE.GLTFLoader = (function() {
    function GLTFLoader(manager) {
        this.manager = manager || THREE.DefaultLoadingManager;
    }

    GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');
        
        loader.load(url, function(data) {
            try {
                var buffer = new Uint8Array(data);
                var magic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
                
                if (magic !== 'glTF') {
                    throw new Error('Not a GLB file');
                }

                var view = new DataView(data);
                var version = view.getUint32(4, true);
                var jsonLength = view.getUint32(12, true);
                
                // JSON块从第20字节开始（12字节头 + 8字节块头）
                var jsonBytes = buffer.subarray(20, 20 + jsonLength);
                var jsonString = new TextDecoder('utf-8').decode(jsonBytes);
                var json = JSON.parse(jsonString);

                var result = { scene: new THREE.Group() };
                var bufferStart = 20 + jsonLength;
                
                // 处理剩余的二进制块
                var bufferData = data.slice(bufferStart);
                
                self.parse(json, bufferData, result, onLoad, onError);
                
            } catch (e) {
                console.error('GLB加载失败:', e.message);
                if (onError) onError(e);
            }
        }, onProgress, onError);
    };

    GLTFLoader.prototype.parse = function(json, bufferData, result, callback, onError) {
        var self = this;
        
        // 创建材质
        var materials = {};
        if (json.materials) {
            json.materials.forEach(function(mat, i) {
                var material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.0,
                    roughness: 1.0
                });
                
                // 解析PBR材质
                if (mat.pbrMetallicRoughness) {
                    var pbr = mat.pbrMetallicRoughness;
                    
                    // 基础颜色
                    if (pbr.baseColorFactor) {
                        var color = new THREE.Color();
                        color.fromArray(pbr.baseColorFactor);
                        material.color = color;
                    }
                    
                    // 金属度
                    if (pbr.metallicFactor !== undefined) {
                        material.metalness = pbr.metallicFactor;
                    }
                    
                    // 粗糙度
                    if (pbr.roughnessFactor !== undefined) {
                        material.roughness = pbr.roughnessFactor;
                    }
                }
                
                // 双面材质
                if (mat.doubleSided) {
                    material.side = THREE.DoubleSide;
                }
                
                materials[i] = material;
            });
        }

        // 创建几何体
        var geometries = {};
        var pending = [];

        if (json.meshes) {
            json.meshes.forEach(function(mesh, meshIndex) {
                mesh.primitives.forEach(function(primitive, primIndex) {
                    var geomPromise = self.createGeometry(primitive, json, bufferData);
                    pending.push(geomPromise.then(function(geometry) {
                        geometries[meshIndex + '-' + primIndex] = geometry;
                    }));
                });
            });
        }

        Promise.all(pending).then(function() {
            // 创建网格
            var meshes = {};
            if (json.meshes) {
                json.meshes.forEach(function(mesh, meshIndex) {
                    mesh.primitives.forEach(function(primitive, primIndex) {
                        var geometry = geometries[meshIndex + '-' + primIndex];
                        var material = materials[primitive.material] || new THREE.MeshStandardMaterial({color: 0x667eea});
                        meshes[meshIndex + '-' + primIndex] = new THREE.Mesh(geometry, material);
                    });
                });
            }

            // 创建节点
            if (json.nodes) {
                json.nodes.forEach(function(node) {
                    var obj;
                    if (node.mesh !== undefined) {
                        obj = meshes[node.mesh + '-0'] ? meshes[node.mesh + '-0'].clone() : new THREE.Mesh();
                    } else {
                        obj = new THREE.Object3D();
                    }

                    if (node.name) obj.name = node.name;
                    if (node.translation) obj.position.fromArray(node.translation);
                    if (node.rotation) obj.quaternion.fromArray(node.rotation);
                    if (node.scale) obj.scale.fromArray(node.scale);

                    result.scene.add(obj);
                });
            }

            callback(result);
        }).catch(function(e) {
            if (onError) onError(e);
        });
    };

    GLTFLoader.prototype.createGeometry = function(primitive, json, bufferData) {
        var geometry = new THREE.BufferGeometry();

        for (var attrName in primitive.attributes) {
            var accessor = json.accessors[primitive.attributes[attrName]];
            var bufferView = json.bufferViews[accessor.bufferView];
            
            var byteOffset = bufferView.byteOffset || 0;
            var TypedArray = accessor.componentType === 5126 ? Float32Array : Uint16Array;
            var itemSize = accessor.type === 'VEC3' ? 3 : accessor.type === 'VEC2' ? 2 : 4;

            var data = new Uint8Array(bufferData, byteOffset, bufferView.byteLength);
            var array = new TypedArray(data.buffer, data.byteOffset, data.byteLength / TypedArray.BYTES_PER_ELEMENT);
            geometry.setAttribute(attrName.toLowerCase(), new THREE.BufferAttribute(array, itemSize));
        }

        if (primitive.indices !== undefined) {
            var accessor = json.accessors[primitive.indices];
            var bufferView = json.bufferViews[accessor.bufferView];
            var byteOffset = bufferView.byteOffset || 0;
            var TypedArray = accessor.componentType === 5123 ? Uint16Array : Uint32Array;
            
            var data = new Uint8Array(bufferData, byteOffset, bufferView.byteLength);
            var indices = new TypedArray(data.buffer, data.byteOffset, data.byteLength / TypedArray.BYTES_PER_ELEMENT);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }

        return Promise.resolve(geometry);
    };

    return GLTFLoader;
})();