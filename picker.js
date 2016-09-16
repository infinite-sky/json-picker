/**
 * 从对象中获取需要的属性
 * Created by admin on 2016/9/15.
 */
'use strict';
const _ = require('lodash');

module.exports = Picker;

//错误类型
const PARAM_ERRORTYPE = {
  PATH_NOTFIND : '寻找路径失败',
  PATH_TYPEERR : '非法路径类型',
  RET_ISNULL   : '返回内容为空',
  DEFAULT_ERROR: '未知错误'
};

function Picker(path) {
  this.path = path || '';
}

Picker.prototype.errorArr = function (ctx, errType) {
  let retMsg = '';
  if (errType) {
    retMsg = PARAM_ERRORTYPE[errType];
  } else {
    retMsg = PARAM_ERRORTYPE.DEFAULT_ERROR
  }
  ctx.body = {status: 'pickerError', msg: retMsg};
  return true;
};
/**
 * picker main func
 * @param ctx
 * @param paths      an array contain all the paths
 * @param type        type = "relative" for relative path;type = "absolute" for absolute path
 * @returns {boolean}
 */
Picker.prototype.picker = function (ctx, paths, type) {
  let self = this, pathArr = [];
  type     = type || 'absolute';
  try {
    pathArr = (paths || '').split(',');
  } catch (e) {
    this.errorArr('PATH_TYPEERR');
  }
  let ctxForForest = _.cloneDeep(ctx);
  let forest       = this.buildForest(ctxForForest);

  let delPath = this.delBrotherNode(pathArr, forest, type);
  return this.delMsgElem(ctx, delPath);
};

/**
 * select del path in brother-node
 * @param pathArr
 * @param forest
 * @param type
 * @returns {Array}
 */
Picker.prototype.delBrotherNode = function (pathArr, forest, type) {
  let delPathArr = [];
  pathArr.forEach(path => {
    if (~forest.indexOf(path)) {
      let superiorPath = _.dropRight(path.split('.')). join('.');
      if(!superiorPath){
        forest.forEach(branch => {
          if (!~branch.indexOf(path) && branch !== superiorPath && branch !== path) {
            delPathArr.push(branch);
          }
        });
      }else{
        forest.forEach(branch => {
          if (~branch.indexOf(superiorPath) && branch !== superiorPath && branch !== path) {
            delPathArr.push(branch);
          }
        });
      }
    }
  });
  return delPathArr;
};

/**
 * del
 * @param ctx
 * @param delPathArr
 */
Picker.prototype.delMsgElem = function (ctx, delPathArr) {
  let retContent = ctx.body || {};
  delPathArr.forEach(delPath => {
    //console.log(delPath);
    getPathValue(retContent, delPath.split('.'));
  });
  return retContent;
  function getPathValue(obj, path) {
    if (!path || !path.length) {
      return true;
    }

    var pathLen = path.length;
    var isArray = Array.isArray(obj);
    var isObj   = realType(obj) === '[object Object]';
    if (pathLen === 1) {
      if (isArray) {
        delArrObj(obj, path[0]);
        return true;
      } else if (isObj) {
        delete obj[path[0]];
        return true;
      } else {
        if (obj === undefined) {
          return true;
        } else {
          delete obj[path[0]];
        }
      }
    } else {
      if (isArray) {
        var len = obj.length;
        try {
          while (len--) {
            getPathValue(obj[len], path);
          }
          return true
        } catch (e) {
          console.error('while loop false');
          return false;
        }
      } else if (isObj) {
        var key = path.shift();
        obj     = obj[key];
        return getPathValue(obj, path);
      } else {
        if (obj === undefined) {
          return true;
        } else {
          throw  new Error('type error');
        }
      }
    }
  }

  function delArrObj(arr, key) {
    var len = arr.length;
    while (len--) {
      delete arr[len][key];
    }
    return true;
  }

  function realType(obj) {
    return Object.prototype.toString.call(obj);
  }

};

var msg = {a: 1, b: {b1: 1, b2: 1}, c: [{c1: 1, c2: 1}, {c1: 1}, {c1: 1, c3: [{c31: 1, c32: 1}]}]};

//del(msg, ['c', 'c3']);
//console.log(msg);
function del(obj, path) {
  if (!path || !path.length) {
    return true;
  }
  var pathLen = path.length;
  var isArray = Array.isArray(obj);
  var isObj   = realType(obj) === '[object Object]';
  if (pathLen === 1) {
    //console.log(obj, path);
    if (isArray) {
      delArrObj(obj, path[0]);
      return true;
    }
    if (isObj) {
      delete obj[path[0]];
      return true;
    }
    throw new Error('type error');
  } else {
    if (isArray) {
      var len = obj.length;
      try {
        while (len--) {
          del(obj[len], path);
        }
        return true
      } catch (e) {
        //console.error('while loop false');
        return false;
      }
    } else if (isObj) {
      var key = path.shift();
      obj     = obj[key];
      return del(obj, path);
    } else {
      throw  new Error('type error');
    }
  }
  function realType(obj) {
    return Object.prototype.toString.call(obj);
  }

}

function delArrObj(arr, key) {
  var len = arr.length;
  while (len--) {
    delete arr[len][key];
  }
  return true;
}

Picker.prototype.delElemInArr = function (value, key) {
  if (Array.isArray(value)) {                       //typeof value is 'array'
    value.forEach(arrElem => {
      delete arrElem[key];
    })
  } else if (typeof value === 'object') {            //typeof value is 'json'
    delete value[key];
  }
};

Picker.prototype.delElemInObj = function (value, key) {

};

/**
 * 为返回的json构建路径的森林
 * @param ctx
 */
Picker.prototype.buildForest = function (ctx) {
  let retContent = ctx.body || {};
  if (retContent === undefined) {
    this.errorArr('RET_ISNULL');
  } else {
    //console.log(this.jsonToForest(retContent));
    return this.jsonToForest(retContent);
  }
};

/**
 * 遍历拼接成深层数组，然后展平
 * @param obj
 */
Picker.prototype.jsonToForest = function (obj) {
  var tempArr = [];
  ergodic(obj);
  return _.uniq(tempArr, true);
  function ergodic(obj) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        tempArr.push(key);
        Object.keys(obj[key]).forEach(subKey=> {
          obj[key][key + '.' + subKey] = obj[key][subKey];
          delete  obj[key][subKey];
        });
        ergodic(obj[key]);
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach(function (arrObj) {
          arrObj[key] = _.cloneDeep(arrObj);
          ergodic(_.pick(arrObj, [key]));
        })
      } else {
        tempArr.push(key);
      }
    });
  }
};