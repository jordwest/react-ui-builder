'use strict';

var _ = require('underscore');
var path = require('path');

var fs = require('fs-extra');
var exec = require('child_process').exec;

var Compiler = require('./Compiler.js');
var Client = require('./Client.js');
var StorageManager = require('./StorageManager.js');
var ComponentsIndexManager = require('./ComponentsIndexManager.js');
var ComponentGenerator = require('./ComponentGenerator.js');
var ComponentCodeRewriter = require('./ComponentCodeRewriter.js');

var projectDirPath = null;
var projectConfDirPath = null;
var projectComponentsIndexFilePath = null;
var projectComponentsArray = null;
var projectComponentsTree = null;

var FacadeProjectLocal = {

    /**
     *
     * @param {object} options
     * @param {function} callback(err, data)
     * {object} data
     */
    loadProjectModel: function(options, callback){
        if(options.dirPath && options.dirPath.length > 0){
            //
            projectDirPath = options.dirPath;
            projectConfDirPath = path.join(projectDirPath, '.builder');
            //
            //
            fs.lstat(projectConfDirPath, function(err, stat){
                if(err){
                    callback(err);
                } else {
                    if(stat.isDirectory()){
                        StorageManager.readObject(path.join(projectConfDirPath, 'model.json'), function(err, data){
                            if(err){
                                callback(err);
                            } else {
                                //
                                callback(null, {
                                    model: data
                                });
                                //
                            }
                        });
                    } else {
                        callback('It seems this is not a react-ui-builder\'s project here: ' + projectDirPath);
                    }
                }
            });
            //
        } else {
            callback('Project directory path is not specified.');
        }
    },

    saveProjectModel: function(options, callback){
        if(projectConfDirPath && projectConfDirPath.length > 0){
            //
            fs.lstat(projectConfDirPath, function(err, stat){
                if(err){
                    callback(err);
                } else {
                    if(stat.isDirectory()){
                        StorageManager.writeObject(path.join(projectConfDirPath, 'model.json'), options.model, function(err, data){
                            if(err){
                                callback(err);
                            } else {
                                //
                                callback(null, {});
                                //
                            }
                        });
                    } else {
                        callback('It seems this is not a react-ui-builder\'s project here: ' + projectDirPath);
                    }
                }
            });
            //
        } else {
            callback('Project config directory path was not specified.');
        }
    },

    readLocalConfig: function(callback){
        StorageManager.readObject(path.join(projectConfDirPath, 'config.json'), function(err, data){
            if(err){
                callback(err);
            } else {
                //
                callback(null, data);
                //
            }
        });
    },

    storeLocalConfig: function(options, callback){
        StorageManager.writeObject(path.join(projectConfDirPath, 'config.json'), options, function(err, data){
            if(err){
                callback(err);
            } else {
                //
                callback(null, {});
                //
            }
        });
    },

    loadProjectProxyUrl: function(options, callback){
        if(projectConfDirPath && projectConfDirPath.length > 0){
            //
            fs.lstat(projectConfDirPath, function(err, stat){
                if(err){
                    callback(err);
                } else {
                    if(stat.isDirectory()){
                        var proxyConfFilePath = path.join(projectConfDirPath, 'proxy.json');
                        StorageManager.readObject(proxyConfFilePath, function(err, data){
                            var _data = data;
                            if(err){
                                _data = {};
                            }
                            if (options.proxyURL && options.proxyURL.length > 0) {
                                _data.proxyURL = options.proxyURL;
                            } else if(options.proxyURLDelete) {
                                _data.proxyURL = null;
                            }
                            StorageManager.writeObject(proxyConfFilePath, _data, function (err) {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            callback(null, _data.proxyURL);
                        });

                    } else {
                        callback('It seems this is not a react-ui-builder\'s project here: ' + projectDirPath);
                    }
                }
            });
            //
        } else {
            callback('Project config directory path was not specified.');
        }
    },

    loadComponentIndex: function(callback){
        if(projectDirPath && projectDirPath.length > 0){

            StorageManager.readDir(projectDirPath, function(err, foundFiles){
                if(err){
                    callback(err);
                } else {
                    if(foundFiles.files.length <= 0) {
                        callback('components-index.js file was not found in ' + projectDirPath);
                    } else if(foundFiles.files.length > 1){
                        callback('Too many components-index.js files were found in ' + projectDirPath);
                    } else {
                        projectComponentsIndexFilePath = foundFiles.files[0];
                        //
                        ComponentsIndexManager.loadIndex(projectComponentsIndexFilePath, function(err, data){
                            if(err){
                                callback(err);
                            } else{
                                callback(null, data);
                            }
                        });
                    }
                }
            }, ['components-index.js']);
        } else {
            callback('Project directory path was not specified.');
        }
    },

    loadFluxFiles: function(options, callback){
        if(projectComponentsIndexFilePath && projectComponentsIndexFilePath.length > 0){

            var indexFileDirPath = path.dirname(projectComponentsIndexFilePath);
            var testFiles = [
                options.componentName + 'Actions.js', options.componentName + 'Store.js'
            ];
            StorageManager.readDir(indexFileDirPath, function(err, foundFiles){
                if(err){
                    callback(err);
                } else {
                    if(foundFiles.files.length === 2) {
                        var actionsSourceFilePath = null;
                        var storeSourceFilePath = null;
                        _.forEach(foundFiles.files, function(filePath){
                            if(filePath.indexOf('Actions.js') >= 0){
                                actionsSourceFilePath = filePath;
                            } else if(filePath.indexOf('Store.js') >= 0){
                                storeSourceFilePath = filePath;
                            }
                        });
                        StorageManager.readFiles(
                            [
                                {filePath: actionsSourceFilePath}, {filePath: storeSourceFilePath}
                            ],
                            0,
                            function(err, dataArray){
                                if(err){
                                    console.error(err);
                                } else {
                                    callback(null, {
                                        actionsSourceCode: dataArray[0],
                                        storeSourceCode: dataArray[1]
                                    })
                                }
                            }
                        )
                    } else {
                        callback(null, {});
                    }
                }
            }, testFiles);
        } else {
            callback('components-index.js file was not specified.');
        }
    },

    /**
     * @param {object} options
     * @param {string} options.templateDir
     * @param {function} callback
     */
    generateProjectResources: function(options, callback){
        if(projectConfDirPath && projectConfDirPath.length > 0){

            // Copy of directory structure of builder assets
            var copyResources = [
                {
                    src: path.join(options.templateDir, 'build', 'assets'),
                    dest: path.join(projectConfDirPath, 'build', 'assets')
                }
            ];
            StorageManager.copyFiles(copyResources, 0, function(err){
                    if(err){
                        callback(err);
                    } else {
                        // Files for generation
                        var generateResources = [ ];
                        //
                        var pageForDeskFilePath = path.join(projectConfDirPath, 'src', 'PageForDesk.js');
                        generateResources.push({
                            templateFilePath: path.join(options.templateDir, 'app', '_page_js.tpl'),
                            fileData: {indexFilePath: projectComponentsIndexFilePath, componentsArray: projectComponentsArray},
                            outputFilePath: pageForDeskFilePath
                        });
                        // Page.html for deskpage iframe src
                        var htmlForDeskFilePath = path.join(projectConfDirPath, 'build', 'PageForDesk.html');
                        fs.stat(htmlForDeskFilePath, function(err, stats){
                            if(err || !stats.isFile()){
                                generateResources.push({
                                    templateFilePath: path.join(options.templateDir, 'build', '_page_html.tpl'),
                                    fileData: {},
                                    outputFilePath: htmlForDeskFilePath
                                });
                            }
                            var response = {
                                htmlForDesk: 'PageForDesk.html'
                            };
                            StorageManager.generateFiles(generateResources, 0, function(err){ callback(err, response) });
                        });
                    }
                }
            );
        } else {
            callback('Project config directory path was not specified.');
        }
    },

    /**
     * @param {function} callback
     */
    compileProjectResourcesWithInstall: function(options, callback){
        //var execPath = path.join(projectDirPath, 'npm install');
        var child = exec('npm install', {cwd: projectDirPath},
            function (error, stdout, stderr) {
                //console.log('stdout: ' + stdout);
                //console.log('stderr: ' + stderr);
                if (error !== null) {
                    callback(error);
                } else {
                    this.compileProjectResources(options, callback);
                }
            }.bind(this));

    },

    compileProjectResources: function(options, callback){
        // Files for compiling
        var compileResources = [];
        var pageForDeskFilePath = path.join(projectConfDirPath, 'src', 'PageForDesk.js');
        var bundleDirPath = path.join(projectConfDirPath, 'build');
        var nodeModulesPath = path.join(projectDirPath, 'node_modules');
        var builderModulesPath = path.join(options.builderDirPath, 'node_modules');
        compileResources.push({
            builderModulesDir: builderModulesPath,
            nodeModulesDir: nodeModulesPath,
            entryFilePath: pageForDeskFilePath,
            outputDirPath: bundleDirPath,
            outputFileName: 'bundle.js'
        });

        Compiler.compileBunch(compileResources, 0, function(err){ callback(err, {}) });

    },

    startWatchProjectResources: function(options, callback){
        // Files for compiling
        Compiler.stopWatchCompiler(function(){
            //console.log('Restarting compiler');
            var pageForDeskFilePath = path.join(projectConfDirPath, 'src', 'PageForDesk.js');
            var bundleDirPath = path.join(projectConfDirPath, 'build');
            var nodeModulesPath = path.join(projectDirPath, 'node_modules');
            var builderModulesPath = path.join(options.builderDirPath, 'node_modules');
            Compiler.watchCompiler(nodeModulesPath, builderModulesPath, pageForDeskFilePath, bundleDirPath, 'bundle.js', function(err, data){ callback(err, data)} );
        });
    },

    stopWatchProjectResources: function(callback){
        Compiler.stopWatchCompiler(callback);
    },

    loadComponentDefaults: function(options, callback){
        StorageManager.readObject(path.join(projectConfDirPath, 'defaults', options.componentName + '.json'), function(err, data){
            if(err){
                callback(err);
            } else {
                //
                callback(null, {
                    model: data
                });
                //
            }
        });
    },

    saveComponentsDefaults: function(options, callback){
        this.loadComponentDefaults(options, function(err, data){
            var defaults = [];
            if(err){
                // do nothing
            } else {
                defaults = data.model;
            }
            defaults.push(options.componentOptions);
            StorageManager.writeObject(path.join(projectConfDirPath, 'defaults', options.componentName + '.json'),
                defaults,
                function(err){
                    if(err){
                        callback(err);
                    } else {
                        callback();
                    }
                }
            );
        })
    },

    saveAllComponentsDefaults: function(options, callback){
        StorageManager.writeObject(path.join(projectConfDirPath, 'defaults', options.componentName + '.json'),
            options.defaults,
            function(err){
                if(err){
                    callback(err);
                } else {
                    callback();
                }
            }
        );
    },

    checkSourceCode: function(options){
        var result = null;
        var checkMessage = ComponentCodeRewriter.checkCode({sourceCode: options.sourceCode});
        if(!checkMessage){
            checkMessage = ComponentCodeRewriter.checkCode({sourceCode: options.actionsSourceCode});
            if(!checkMessage){
                checkMessage = ComponentCodeRewriter.checkCode({sourceCode: options.storeSourceCode});
                if(checkMessage){
                    result = 'Store source code error: ' + checkMessage;
                }
            } else {
                result = 'Actions source code error: ' + checkMessage;
            }
        } else {
            result = 'Component source code error: ' + checkMessage;
        }
        return result;
    },

    rewriteComponentSourceCode: function(options, callback){
        if(projectComponentsIndexFilePath && projectComponentsIndexFilePath.length > 0){
            //
            var f = function(){
                ComponentCodeRewriter.repairComponentReferences({
                    data: options.sourceCode,
                    indexFilePath: projectComponentsIndexFilePath,
                    componentGroup: options.componentGroup
                }, function(err, data){
                    if(err){
                        callback(err);
                    } else {
                        StorageManager.writeFile({
                            filePath: options.filePath,
                            data: data
                        }, callback);
                    }
                });
            };
            //
            if(options.actionsSourceCode && options.storeSourceCode){
                var indexFileDirPath = path.dirname(projectComponentsIndexFilePath);
                var testFiles = [
                    options.componentName + 'Actions.js', options.componentName + 'Store.js'
                ];
                StorageManager.readDir(indexFileDirPath, function(err, foundFiles){
                    if(err){
                        callback(err);
                    } else {
                        if(foundFiles.files.length === 2) {

                            var actionsSourceFilePath = null;
                            var storeSourceFilePath = null;
                            _.forEach(foundFiles.files, function(filePath){
                                if(filePath.indexOf('Actions.js') >= 0){
                                    actionsSourceFilePath = filePath;
                                } else if(filePath.indexOf('Store.js') >= 0){
                                    storeSourceFilePath = filePath;
                                }
                            });

                            StorageManager.writeFile(
                                {
                                    filePath: actionsSourceFilePath,
                                    data: options.actionsSourceCode
                                },
                                function(err){
                                    if(err){
                                        console.error(err);
                                    } else {
                                        StorageManager.writeFile(
                                            {
                                                filePath: storeSourceFilePath,
                                                data: options.storeSourceCode
                                            },
                                            function(err){
                                                if(err){
                                                    console.error(err);
                                                } else {
                                                    f();
                                                }
                                            }
                                        );
                                    }
                                }
                            );
                        } else {
                            f();
                        }
                    }
                }, testFiles);
            } else {
                f();
            }
            //
        } else {
            callback('components-index.js file was not specified.');
        }
    },

    // Generate the default file paths for newly generated component source
    defaultFilePaths: function(options) {
      if(projectComponentsIndexFilePath && projectComponentsIndexFilePath.length > 0){
          //
          var indexFileDirPath = path.dirname(projectComponentsIndexFilePath);
          var paths = {};

          if(options.componentGroup && options.componentGroup.trim().length > 0){
              paths.componentSource = path.join(indexFileDirPath, 'components', options.componentGroup, options.componentName + '.js');
              paths.store = path.join(indexFileDirPath, 'stores', options.componentGroup, options.componentName + 'Store.js');
              paths.actions = path.join(indexFileDirPath, 'actions', options.componentGroup, options.componentName + 'Actions.js');
              paths.relativeSource = './' + path.join('components', options.componentGroup, options.componentName + '.js');
          } else {
              paths.componentSource = path.join(indexFileDirPath, 'components', options.componentName + '.js');
              paths.store = path.join(indexFileDirPath, 'stores', options.componentName + 'Store.js');
              paths.actions = path.join(indexFileDirPath, 'actions', options.componentName + 'Actions.js');
              paths.relativeSource = './' + path.join('components', options.componentName + '.js');
          }

          if(options.paths){
            paths = _.extend(paths, options.paths);
          }

          return paths;

          //
      } else {
          throw 'components-index.js file was not specified.';
      }
    },

    writeNewComponentSourceCode: function(options, callback){

      var paths = null;
      try {
        paths = this.defaultFilePaths(options);
      }catch (e){
        callback(e);
        return;
      }

      var f = function(){
          //
          ComponentCodeRewriter.repairComponentReferences({
              data: options.sourceCode,
              indexFilePath: projectComponentsIndexFilePath,
              componentGroup: options.componentGroup
          }, function(err, data){
              if(err){
                  callback(err);
              } else {
                  StorageManager.writeFile(
                      {
                          filePath: paths.componentSource,
                          data: data
                      },
                      function(err){
                          if(err){
                              callback(err);
                          } else {
                              ComponentsIndexManager.modifyIndex(projectComponentsIndexFilePath,
                                  {
                                      componentGroup: options.componentGroup,
                                      componentName: options.componentName,
                                      relativeFilePath: paths.relativeSource
                                  },
                                  function (err) {
                                      if (err) {
                                          callback(err);
                                      } else {
                                          callback();
                                      }
                                  }
                              );
                          }
                      }
                  );
              }
          });
      };
      //
      if(options.actionsSourceCode && options.storeSourceCode){
          StorageManager.writeFile(
              {
                  filePath: paths.actions,
                  data: options.actionsSourceCode
              },
              function(err){
                  if(err){
                      callback(err);
                  } else {
                      StorageManager.writeFile(
                          {
                              filePath: paths.store,
                              data: options.storeSourceCode
                          },
                          function(err){
                              if(err){
                                  callback(err);
                              } else {
                                  f();
                              }
                          }
                      );
                  }
              }
          );
      } else {
          f();
      }
    },

    generateComponentChildrenCode: function(options, callback){
        if(projectComponentsIndexFilePath && projectComponentsIndexFilePath.length > 0) {

            ComponentGenerator.generateComponentChildrenCode(
                {
                    templateDir: options.templateDir,
                    componentModel: options.componentModel
                },
                function(err, data){
                    if (err) {
                        //console.error(err);
                        callback(err);
                    } else {
                        ComponentCodeRewriter.rewriteChildren(
                            {
                                sourceCode: options.sourceCode,
                                childrenSourceCode: data
                            },
                            function(err, data){
                                if(err){
                                    callback(err);
                                } else {
                                    ComponentCodeRewriter.repairComponentReferences(
                                        {
                                            data: data,
                                            indexFilePath: projectComponentsIndexFilePath,
                                            componentGroup: options.componentGroup,
                                            forceToFormat: true
                                        },
                                        function(err, data){
                                            if(err){
                                                callback(err);
                                            } else {
                                                callback(null, data);
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                }
            );
        } else {
            callback('components-index.js file was not specified.');
        }
    },

    /**
     *
     * @param options
     * @param callback
     */
    readFilesInProjectDir: function(options, callback){
        StorageManager.readDirFlat(projectDirPath, function(err, data){
            if(err){
                callback(err);
            } else {
                callback(null, data);
            }
        });
    },

    /**
     *
     * @param options
     * @param callback
     */
    uploadFilesToGallery: function(options, callback){
        var toRemoveFile1 = path.join(projectDirPath, 'builder.tar.gz');
        var toRemoveFile2 = path.join(projectDirPath, 'app.tar.gz');
        StorageManager.packTarGz(
            [
                {
                    sourcePath: path.join(projectDirPath, '.builder'),
                    destFilePath: toRemoveFile1,
                    entries: null
                },
                {
                    sourcePath: projectDirPath,
                    destFilePath: toRemoveFile2,
                    entries: options.entries
                }
            ],
            function(err){
                if(err){
                    callback(err);
                } else {
                    Client.upload(
                        [
                            {
                                url: '/secure/uploadProject/' + options.projectId,
                                filePaths:[
                                    toRemoveFile1, toRemoveFile2
                                ]
                            }
                        ],
                        function(err){
                            if(err){
                                callback(err);
                            } else {
                                StorageManager.removeFiles(
                                    [
                                        {filePath: toRemoveFile1},
                                        {filePath: toRemoveFile2}
                                    ],
                                    function (err) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback();
                                        }
                                    },
                                    0
                                );
                            }
                        },
                        true,
                        0
                    );
                }
            },
            0
        );
    }


};

module.exports = FacadeProjectLocal;
