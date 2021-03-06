angular.module('app')

.factory('CrudRestUtils', function($http, $q, $cacheFactory, $window, CollectionUtils, Utils){
  'use strict';
  var service = {
    createCrud: createCrud,
    createCrudCtrl: createCrudCtrl
  };

  /*
   * Create a service connected to a REST backend with following endpoints :
   *  - GET     /endpoint       : return an array of all values in the property 'data' of the response
   *  - GET     /endpoint?where : return an array of values matching object specified in 'where' in the property 'data' of the response
   *  - GET     /endpoint/:id   : return the value with the specified id in the property 'data' of the response
   *  - POST    /endpoint       : create new value with a random id an return the created id in the property 'data' of the response
   *  - PUT     /endpoint/:id   : update the value with the specified id
   *  - DELETE  /endpoint/:id   : delete the value with the specified id and return only the status code
   */
  function createCrud(endpointUrl, _objectKey, _getData, _processBreforeSave, _useCache, _httpConfig){
    var objectKey = _objectKey ? _objectKey : 'id';
    var cache = _useCache === false ? null : $cacheFactory(endpointUrl);
    var CrudSrv = {
      eltKey:   objectKey,
      getUrl:   function(_id)           { return _crudGetUrl(endpointUrl, _id);                                                             },
      getAll:   function(_noCache)      { return _crudGetAll(endpointUrl, objectKey, cache, _noCache, _getData, _httpConfig);               },
      find:     function(where)         { return _crudFind(where, endpointUrl, objectKey, cache, _getData, _httpConfig);                    },
      findOne:  function(where)         { return _crudFindOne(where, endpointUrl, objectKey, cache, _getData, _httpConfig);                 },
      get:      function(id, _noCache)  { return _crudGet(id, endpointUrl, objectKey, cache, _noCache, _getData, _httpConfig);              },
      save:     function(elt)           { return _crudSave(elt, endpointUrl, objectKey, cache, _processBreforeSave, _getData, _httpConfig); },
      remove:   function(elt)           { return _crudRemove(elt, endpointUrl, objectKey, cache, _httpConfig);                              }
    };
    return CrudSrv;
  }

  /*
   * Create data and functions to use in crud controller, based on a CrudSrv
   */
  function createCrudCtrl(CrudSrv, _defaultSort, _defaultFormElt){
    var data = {
      elts:           [],
      currentSort:    _defaultSort ? _defaultSort : {},
      selectedElt:    null,
      selectedElts:   [],
      defaultFormElt: _defaultFormElt ? _defaultFormElt : {},
      form:           null,
      status: {
        error:    null,
        loading:  true,
        saving:   false,
        removing: false
      }
    };
    var ctrl = {
      data: data,
      fn: {
        isSelected:     function(elt)             { return _ctrlIsSelected(elt, data);      },
        isNoneSelected: function()                { return _ctrlIsNoneSelected(data);       },
        isSomeSelected: function()                { return _ctrlIsSomeSelected(data);       },
        isAllSelected:  function()                { return _ctrlIsAllSelected(data);        },
        sort:           function(order, _desc)    { _ctrlSort(order, _desc, data);          },
        toggle:         function(elt)             { _ctrlToggle(elt, CrudSrv, data);        },
        toggleAll:      function()                { _ctrlToggleAll(data);                   },
        create:         function()                { _ctrlCreate(data);                      },
        edit:           function(elt)             { _ctrlEdit(elt, data);                   },
        addElt:         function(obj, attr, _elt) { _ctrlAddElt(obj, attr, _elt);           },
        removeElt:      function(arr, index)      { _ctrlRemoveElt(arr, index);             },
        cancelEdit:     function()                { _ctrlCancelEdit(data);                  },
        save:           function(_elt)            { return _ctrlSave(_elt, CrudSrv, data);  },
        remove:         function(elt)             { return _ctrlRemove(elt, CrudSrv, data); },
        eltRestUrl:     function(_elt)            { return _ctrlEltRestUrl(_elt, CrudSrv);  }
      }
    };

    _ctrlInit(CrudSrv, data, _defaultSort);
    return ctrl;
  }


  function _crudGetUrl(endpointUrl, _id){
    return endpointUrl+(_id ? '/'+_id : '');
  }
  function _crudConfig(_cache, _httpConfig){
    var cfg = _httpConfig ? angular.copy(_httpConfig) : {};
    if(_cache){
      cfg.cache = _cache;
    }
    return cfg;
  }
  function _setInCache(_cache, endpointUrl, objectKey, result, elt){
    if(_cache){ _cache.put(_crudGetUrl(endpointUrl, elt[objectKey]), [result.status, JSON.stringify(elt), result.headers(), result.statusText]); }
  }
  function _invalideAllCache(_cache, endpointUrl){
    if(_cache){ _cache.remove(_crudGetUrl(endpointUrl)); }
  }

  function _crudGetAll(endpointUrl, objectKey, _cache, _noCache, _getData, _httpConfig){
    var url = _crudGetUrl(endpointUrl);
    if(_cache && _noCache){ _cache.remove(url); }
    return $http.get(url, _crudConfig(_cache, _httpConfig)).then(function(result){
      var elts = typeof _getData === 'function' ? _getData(result) : result.data;
      if(Array.isArray(elts)){
        if(_cache){ // add all individual elements to cache !
          for(var i in elts){
            _setInCache(_cache, endpointUrl, objectKey, result, elts[i]);
          }
        }
        return elts;
      }
    });
  }

  function _crudFind(where, endpointUrl, objectKey, _cache, _getData, _httpConfig){
    var url = _crudGetUrl(endpointUrl);
    return $http.get(url+'?where='+JSON.stringify(where), _crudConfig(null, _httpConfig)).then(function(result){
      var elts = typeof _getData === 'function' ? _getData(result) : result.data;
      if(Array.isArray(elts)){
        if(_cache){ // add all individual elements to cache !
          for(var i in elts){
            _setInCache(_cache, endpointUrl, objectKey, result, elts[i]);
          }
        }
        return elts;
      }
    });
  }

  function _crudFindOne(where, endpointUrl, objectKey, _cache, _getData, _httpConfig){
    return _crudFind(where, endpointUrl, objectKey, _cache, _getData, _httpConfig).then(function(elts){
      if(Array.isArray(elts) && elts.length > 0){
        if(elts.length > 1){ console.warn('More than one result for clause', where); }
        return elts[0];
      }
    });
  }

  function _crudGet(id, endpointUrl, objectKey, _cache, _noCache, _getData, _httpConfig){
    var url = _crudGetUrl(endpointUrl, id);
    if(_cache && _noCache){ _cache.remove(url); }
    return $http.get(url, _crudConfig(_cache, _httpConfig)).then(function(result){
      var elt = typeof _getData === 'function' ? _getData(result) : result.data;
      if(elt && elt[objectKey]){
        return elt;
      }
    });
  }

  function _crudSave(elt, endpointUrl, objectKey, _cache, _processBreforeSave, _getData, _httpConfig){
    if(elt){
      if(typeof _processBreforeSave === 'function'){ _processBreforeSave(elt); }
      var promise = null;
      if(elt[objectKey]){ // update
        promise = $http.put(_crudGetUrl(endpointUrl, elt[objectKey]), elt, _crudConfig(null, _httpConfig));
      } else { // create
        promise = $http.post(_crudGetUrl(endpointUrl), elt, _crudConfig(null, _httpConfig));
      }
      return promise.then(function(result){
        var data = typeof _getData === 'function' ? _getData(result) : result.data;
        var newElt = angular.copy(elt);
        if(!newElt[objectKey] && data[objectKey]){ newElt[objectKey] = data[objectKey]; }
        _setInCache(_cache, endpointUrl, objectKey, result, newElt);
        _invalideAllCache(_cache, endpointUrl);
        return newElt;
      });
    } else {
      return $q.when();
    }
  }

  function _crudRemove(elt, endpointUrl, objectKey, _cache, _httpConfig){
    if(elt && elt[objectKey]){
      var url = _crudGetUrl(endpointUrl, elt[objectKey]);
      return $http.delete(url, _crudConfig(null, _httpConfig)).then(function(result){
        if(_cache){
          _cache.remove(url);
          _invalideAllCache(_cache, endpointUrl);
        }
      });
    } else {
      return $q.when();
    }
  }

  function _ctrlInit(CrudSrv, data, _defaultSort){
    if(_defaultSort){Utils.sort(data.elts, _defaultSort);}

    CrudSrv.getAll().then(function(elts){
      if(data.currentSort){ Utils.sort(elts, data.currentSort); }
      data.elts = elts;
      data.status.loading = false;
    }, function(err){
      console.warn('can\'t load data', err);
      data.status.loading = false;
      data.status.error = err.statusText ? err.statusText : 'Unable to load data :(';
    });
  }

  function _ctrlIsSelected(elt, data) { return data && data.selectedElts.indexOf(elt) >= 0;                                                       };
  function _ctrlIsNoneSelected(data)  { return data && data.selectedElts.length === 0;                                                            };
  function _ctrlIsSomeSelected(data)  { return data && data.elts && 0 < data.selectedElts.length && data.selectedElts.length < data.elts.length;  };
  function _ctrlIsAllSelected (data)  { return data && data.elts && data.selectedElts.length === data.elts.length;                                };

  function _ctrlSort(order, _desc, data){
    if(data.currentSort.order === order){
      data.currentSort.desc = !data.currentSort.desc;
    } else {
      data.currentSort = {order: order, desc: _desc ? _desc : false};
    }
    Utils.sort(data.elts, data.currentSort);
  }

  function _ctrlToggle(elt, CrudSrv, data){
    if(elt && data.selectedElt && elt[CrudSrv.eltKey] === data.selectedElt[CrudSrv.eltKey]){
      data.selectedElt = null;
    } else {
      data.selectedElt = elt;
    }
    data.form = null;

    if(elt && Array.isArray(data.selectedElts)){
      var index = data.selectedElts.indexOf(elt);
      if(index >= 0){
        data.selectedElts.splice(index, 1);
      } else {
        data.selectedElts.push(elt);
      }
    }
  }

  function _ctrlToggleAll(data){
    if(data && data.elts){
      if(_ctrlIsNoneSelected(data)){
        for(var i in data.elts){
          data.selectedElts.push(data.elts[i]);
        }
      } else {
        CollectionUtils.clear(data.selectedElts);
      }
    }
  };

  function _ctrlCreate(data){
    data.form = angular.copy(data.defaultFormElt);
  }

  function _ctrlEdit(elt, data){
    data.form = angular.copy(elt);
  }

  function _ctrlAddElt(obj, attr, _elt){
    if(obj && typeof obj === 'object'){
      if(!Array.isArray(obj[attr])){ obj[attr] = []; }
      var elt = _elt ? angular.copy(_elt) : {};
      obj[attr].push(elt);
    } else {
      console.warn('Unable to addElt to', obj);
    }
  }
  function _ctrlRemoveElt(arr, index){
    if(Array.isArray(arr) && index < arr.length){ arr.splice(index, 1); }
    else { console.warn('Unable to removeElt <'+index+'> from', arr); }
  }

  function _ctrlCancelEdit(data){
    data.form = null;
  }

  function _ctrlSave(_elt, CrudSrv, data){
    data.status.saving = true;
    var elt = _elt ? _elt : data.form;
    return CrudSrv.save(elt).then(function(elt){
      CollectionUtils.upsertEltBy(data.elts, elt, CrudSrv.eltKey);
      if(data.currentSort){Utils.sort(data.elts, data.currentSort);}
      data.selectedElt = elt;
      data.form = null;
      data.status.loading = false;
      data.status.saving = false;
    }, function(err){
      console.log('Error', err);
      data.status.saving = false;
      data.status.error = err;
    });
  }

  function _ctrlRemove(elt, CrudSrv, data){
    if(elt && elt[CrudSrv.eltKey] && $window.confirm('Supprimer ?')){
      data.status.removing = true;
      return CrudSrv.remove(elt).then(function(){
        CollectionUtils.removeEltBy(data.elts, elt, CrudSrv.eltKey);
        data.selectedElt = null;
        data.form = null;
        data.status.loading = false;
        data.status.removing = false;
      }, function(err){
        console.log('Error', err);
        data.status.removing = false;
        data.status.error = err;
      });
    } else {
      return $q.when();
    }
  }

  function _ctrlEltRestUrl(_elt, CrudSrv){
    return _elt && _elt[CrudSrv.eltKey] ? CrudSrv.getUrl(_elt[CrudSrv.eltKey]) : CrudSrv.getUrl();
  }

  return service;
});
