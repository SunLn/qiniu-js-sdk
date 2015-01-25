/*global plupload,mOxie*/
/*global ActiveXObject */
/*exported Qiniu */

(function(exports, plupload, mOxie) {
    if (typeof plupload !== 'object' || typeof mOxie !== 'object') {
        throw '七牛 JS-SDK 依赖 Plupload 插件,请引入! 抄送门： http://plupload.com/download';
    }

    function Qiniu(option) {
        var up_host,
            bucket_domain,
            uptoken_url,
            key_func,
            file_uploaded_func,
            uptoken_obj = {};
        var that = this;

        this.version = '2.0.0-beta';
        this.util = {
            parse_json: function(data) {
                // Attempt to parse using the native JSON parser first
                if (window.JSON && window.JSON.parse) {
                    return window.JSON.parse(data);
                }

                if (data === null) {
                    return data;
                }
                if (typeof data === "string") {

                    // Make sure leading/trailing whitespace is removed (IE can't handle it)
                    data = mOxie.trim(data);

                    if (data) {
                        // Make sure the incoming data is actual JSON
                        // Logic borrowed from http://json.org/json2.js
                        if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g, "@").replace(/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {

                            return (function() {
                                return data;
                            })();
                        }
                    }
                }
            },
            //Todo ie7 func / this.parse_json bug;
            create_ajax: function(argument) {
                var xmlhttp = {};
                if (window.XMLHttpRequest) {
                    xmlhttp = new XMLHttpRequest();
                } else {
                    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                }
                return xmlhttp;
            },
            utf8_encode: function(argString) {
                // http://kevin.vanzonneveld.net
                // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
                // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
                // +   improved by: sowberry
                // +    tweaked by: Jack
                // +   bugfixed by: Onno Marsman
                // +   improved by: Yves Sucaet
                // +   bugfixed by: Onno Marsman
                // +   bugfixed by: Ulrich
                // +   bugfixed by: Rafal Kukawski
                // +   improved by: kirilloid
                // +   bugfixed by: kirilloid
                // *     example 1: this.utf8_encode('Kevin van Zonneveld');
                // *     returns 1: 'Kevin van Zonneveld'

                if (argString === null || typeof argString === 'undefined') {
                    return '';
                }

                var string = (argString + ''); // .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                var utftext = '',
                    start, end, stringl = 0;

                start = end = 0;
                stringl = string.length;
                for (var n = 0; n < stringl; n++) {
                    var c1 = string.charCodeAt(n);
                    var enc = null;

                    if (c1 < 128) {
                        end++;
                    } else if (c1 > 127 && c1 < 2048) {
                        enc = String.fromCharCode(
                            (c1 >> 6) | 192, (c1 & 63) | 128
                        );
                    } else if (c1 & 0xF800 ^ 0xD800 > 0) {
                        enc = String.fromCharCode(
                            (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                        );
                    } else { // surrogate pairs
                        if (c1 & 0xFC00 ^ 0xD800 > 0) {
                            throw new RangeError('Unmatched trail surrogate at ' + n);
                        }
                        var c2 = string.charCodeAt(++n);
                        if (c2 & 0xFC00 ^ 0xDC00 > 0) {
                            throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
                        }
                        c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
                        enc = String.fromCharCode(
                            (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                        );
                    }
                    if (enc !== null) {
                        if (end > start) {
                            utftext += string.slice(start, end);
                        }
                        utftext += enc;
                        start = end = n + 1;
                    }
                }

                if (end > start) {
                    utftext += string.slice(start, stringl);
                }

                return utftext;
            },
            base64_encode: function(data) {
                // http://kevin.vanzonneveld.net
                // +   original by: Tyler Akins (http://rumkin.com)
                // +   improved by: Bayron Guevara
                // +   improved by: Thunder.m
                // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
                // +   bugfixed by: Pellentesque Malesuada
                // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
                // -    depends on: this.utf8_encode
                // *     example 1: this.base64_encode('Kevin van Zonneveld');
                // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
                // mozilla has this native
                // - but breaks in 2.0.0.12!
                //if (typeof this.window['atob'] == 'function') {
                //    return atob(data);
                //}
                var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
                var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
                    ac = 0,
                    enc = '',
                    tmp_arr = [];

                if (!data) {
                    return data;
                }

                data = this.utf8_encode(data + '');

                do { // pack three octets into four hexets
                    o1 = data.charCodeAt(i++);
                    o2 = data.charCodeAt(i++);
                    o3 = data.charCodeAt(i++);

                    bits = o1 << 16 | o2 << 8 | o3;

                    h1 = bits >> 18 & 0x3f;
                    h2 = bits >> 12 & 0x3f;
                    h3 = bits >> 6 & 0x3f;
                    h4 = bits & 0x3f;

                    // use hexets to index into b64, and append result to encoded string
                    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
                } while (i < data.length);

                enc = tmp_arr.join('');

                switch (data.length % 3) {
                    case 1:
                        enc = enc.slice(0, -2) + '==';
                        break;
                    case 2:
                        enc = enc.slice(0, -1) + '=';
                        break;
                }

                return enc;
            },
            url_safe_base64_encode: function(v) {
                v = this.base64_encode(v);
                return v.replace(/\//g, '_').replace(/\+/g, '-');
            },
            get_url: function(key) {
                // todo ,may be should removed some day
                if (!key) {
                    return false;
                }
                key = encodeURI(key);
                if (bucket_domain.slice(bucket_domain.length - 1) !== '/') {
                    bucket_domain = bucket_domain + '/';
                }
                return bucket_domain + key;
            }
        };

        var qiniu = {
            Default_Chunk_Size: 4 << 20, //4m
            Https_Up_Host: 'https://up.qbox.me',
            Http_Up_Host: 'http://up.qiniu.com',
            verify: function() {
                if (!option.bucket_domain) {
                    throw '必须指定 bucket_domain!';
                }

                if (!option.browse_button) {
                    throw '必须指定 browse_button!';
                }

                if (!option.uptoken_url) {
                    throw '必须指定 uptoken_url';
                }
            },
            set_qiniu: function() {
                // set up_host、uptoken_url、bucket_domain
                if (option.up_host) {
                    up_host = option.up_host;
                } else {
                    var protocol = window.location.protocol;
                    if (protocol !== 'https') {
                        up_host = qiniu.Http_Up_Host;
                    } else {
                        up_host = qiniu.Https_Up_Host;
                    }
                }
                uptoken_url = option.uptoken_url;
                bucket_domain = option.bucket_domain;

                // set key_func 、file_uploaded_func
                var get_key_func = function() {
                    if (typeof option.init === 'object' && typeof option.init.Key === 'function') {
                        return option.init.Key;
                    }
                    return null;
                };
                var get_file_uploaded_func = function() {
                    if (typeof option.init === 'object' && typeof option.init.FileUploaded === 'function') {
                        return option.init.FileUploaded;
                    }
                    return function() {};
                };

                key_func = get_key_func();
                file_uploaded_func = get_file_uploaded_func();
            },
            reset_option: function() {
                // reset chunk_size 避免bug
                var chunk_size,
                    isOldIE = mOxie.Env.browser === "IE" && mOxie.Env.version <= 9;
                if (isOldIE && option.chunk_size && option.runtimes.indexOf('flash') >= 0) {
                    //  link: http://www.plupload.com/docs/Frequently-Asked-Questions#when-to-use-chunking-and-when-not
                    //  when plupload chunk_size setting is't null ,it cause bug in ie8/9  which runs  flash runtimes (not support html5) .
                    option.chunk_size = 0;

                } else {
                    chunk_size = plupload.parseSize(option.chunk_size);
                    if (chunk_size !== this.Default_Chunk_Size && chunk_size !== 0) {
                        option.chunk_size = this.Default_Chunk_Size;
                    }
                    // qiniu default_chunk_size is 4m
                    // reset chunk_size to default_chunk_size(4m) when chunk_size isn't 4m
                }

                // reset option.init.FileUploaded 避免调用两次
                if (typeof option.init === 'object') {
                    option.init.FileUploaded = function() {};
                }
            },
            get_option: function(up, option) {
                var val = up.getOption && up.getOption(option);
                val = val || (up.settings && up.settings[option]);
                return val;
            },
            get_uptoken: function(file, func) {
                console.log(file);
                if (!option.uptoken) {
                    var ajax = that.util.create_ajax();
                    ajax.open('POST', uptoken_url, true);
                    ajax.setRequestHeader("If-Modified-Since", "0");
                    ajax.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    ajax.onreadystatechange = function() {
                        if (ajax.readyState === 4 && ajax.status === 200) {
                            var res = that.util.parse_json(ajax.responseText);
                            uptoken_obj[file.id] = res.uptoken;
                            func();
                        }
                    };
                    ajax.send("name=" + file.name + "&size=" + file.size + "&bucket_domain=" + bucket_domain + "&type=" + file.type);
                } else {
                    uptoken_obj[file.id] = option.uptoken;
                }
            },
            get_file_key: function(up, file, func) {
                var key = '',
                    unique_name = false;
                if (!option.save_key) {
                    unique_name = this.get_option(up, 'unique_name');
                    if (unique_name) {
                        var ext = mOxie.Mime.getFileExtension(file.name);
                        key = ext ? file.id + '.' + ext : file.id;
                    } else if (typeof func === 'function') {
                        key = func(up, file);
                    } else {
                        key = file.name;
                    }
                }
                return key;
            },
            direct_upload: function(up, file, func) {

                var multipart_params_obj;
                if (option.save_key) {
                    multipart_params_obj = {
                        'token': uptoken_obj[file.id]
                    };
                } else {
                    multipart_params_obj = {
                        'key': this.get_file_key(up, file, func),
                        'token': uptoken_obj[file.id]
                    };
                }

                //setXvars
                var x_vars = option.x_vars;
                if (x_vars !== undefined && typeof x_vars === 'object') {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === 'function') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key](up, file);
                            } else if (typeof x_vars[x_key] !== 'object') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key];
                            }
                        }
                    }
                }

                up.setOption({
                    'url': up_host,
                    'multipart': true,
                    'chunk_size': undefined,
                    'multipart_params': multipart_params_obj
                });
            },
            make_block: function(up, file, key_func) {
                var localFileInfo = localStorage.getItem(file.name),
                    chunk_size = this.get_option(up, 'chunk_size'),
                    blockSize = chunk_size;
                if (localFileInfo) {
                    localFileInfo = JSON.parse(localFileInfo);
                    var now = (new Date()).getTime();
                    var before = localFileInfo.time || 0;
                    var aDay = 24 * 60 * 60 * 1000; //  milliseconds

                    if (now - before < aDay) {
                        if (localFileInfo.percent !== 100) {
                            // 通过检测文件大小，判断是否是同一个文件，如果是恢复上传信息
                            // 在同名且同大小但不同内容的文件，仍有bug，正确的做法是前端获取文件的md5
                            if (file.size === localFileInfo.total) {
                                file.percent = localFileInfo.percent;
                                file.loaded = localFileInfo.offset;
                                ctx = localFileInfo.ctx;
                                if (localFileInfo.offset + blockSize > file.size) {
                                    blockSize = file.size - localFileInfo.offset;
                                }
                            } else {
                                localStorage.removeItem(file.name);
                            }

                        } else {
                            // 进度100%时，删除本地信息，避免 499bug
                            // 为什么不直接 makefile 的原因是会有很多bug，囧
                            localStorage.removeItem(file.name);
                        }
                    } else {
                        localStorage.removeItem(file.name);
                    }
                }

                up.setOption({
                    'url': up_host + '/mkblk/' + blockSize,
                    'multipart': false,
                    'chunk_size': chunk_size,
                    'required_features': "chunks",
                    'headers': {
                        'Authorization': 'UpToken ' + uptoken_obj[file.id]
                    },
                    'multipart_params': {}
                });
            },
            make_file: function(up, file, key_func) {
                var self = this;

                var key = '';
                if (!option.save_key) {
                    key = self.get_file_key(up, file, key_func);
                    key = key ? '/key/' + that.util.url_safe_base64_encode(key) : '';
                }

                var x_vars_url = self.get_x_vals_url();
                var url = up_host + '/mkfile/' + file.size + key + x_vars_url;
                var ajax = that.util.create_ajax();
                ajax.open('POST', url, true);
                ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                ajax.setRequestHeader('Authorization', 'UpToken ' + uptoken_obj[file.id]);
                ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4) {
                        if (ajax.status === 200) {
                            // 文件上传成功后删除 localStorage
                            localStorage.removeItem(file.name);

                            self.success(up, file, ajax.responseText);
                        } else {
                            uploader.trigger('Error', {
                                status: ajax.status,
                                response: ajax.responseText,
                                file: file,
                                code: -200
                            });
                        }
                    }
                };
                ajax.send(ctx);
            },
            save_upload_info: function(file, ctx, info) {
                localStorage.setItem(file.name, JSON.stringify({
                    ctx: ctx,
                    percent: file.percent,
                    total: info.total,
                    offset: info.offset,
                    time: (new Date()).getTime()
                }));
            },
            get_x_vals_url: function(up, file) {
                var x_vars = option.x_vars,
                    x_val = '',
                    x_vars_url = '';
                var url_safe_base64_encode = that.util.url_safe_base64_encode;

                if (x_vars !== undefined && typeof x_vars === 'object') {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === 'function') {
                                x_val = url_safe_base64_encode(x_vars[x_key](up, file));
                            } else if (typeof x_vars[x_key] !== 'object') {
                                x_val = url_safe_base64_encode(x_vars[x_key]);
                            }
                            x_vars_url += '/x:' + x_key + '/' + x_val;
                        }
                    }
                }
                return x_vars_url;
            },
            success: function(up, file, info) {
                info = that.util.parse_json(info);
                file_uploaded_func(up, file, info);
            }
        };

        qiniu.verify();
        qiniu.set_qiniu();
        qiniu.reset_option();

        var plupload_option = {},
            ctx = '';

        plupload.extend(plupload_option, option, {
            url: up_host,
            multipart_params: {
                token: ''
            }
        });

        var uploader = new plupload.Uploader(plupload_option);

        uploader.bind('Init', function(up, params) {});
        uploader.init();

        uploader.bind('FilesAdded', function(up, files) {

            var auto_start = qiniu.get_option(up, 'auto_start');

            plupload.each(files, function(file, i) {
                qiniu.get_uptoken(file, function() {
                    if (auto_start) {
                        up.start();
                    }
                });
            });
            up.refresh(); // Reposition Flash/Silverlight
        });

        uploader.bind('BeforeUpload', function(up, file) {
            ctx = '';
            var chunk_size = qiniu.get_option(up, 'chunk_size');
            if (uploader.runtime === 'html5' && chunk_size) {
                if (file.size < chunk_size) {
                    qiniu.direct_upload(up, file, key_func);
                } else {
                    qiniu.make_block(up, file, key_func);
                }
            } else {
                qiniu.direct_upload(up, file, key_func);
            }
        });

        uploader.bind('ChunkUploaded', function(up, file, info) {
            var res = that.util.parse_json(info.response);
            ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
            var leftSize = info.total - info.offset;
            var chunk_size = qiniu.get_option(up, 'chunk_size');

            if (leftSize < chunk_size) {
                up.setOption({
                    'url': up_host + '/mkblk/' + leftSize
                });
            }
            qiniu.save_upload_info(file, ctx, info);
        });

        uploader.bind('Error', function(up, err) {
            var error = '';
            var file = err.file;
            if (file) {
                switch (err.code) {
                    case plupload.FAILED:
                        error = '上传失败。请稍后再试。';
                        break;
                    case plupload.FILE_SIZE_ERROR:
                        var max_file_size = qiniu.get_option(up, 'max_file_size');
                        error = '浏览器最大可上传' + max_file_size + '。更大文件请使用命令行工具。';
                        break;
                    case plupload.FILE_EXTENSION_ERROR:
                        error = '文件验证失败。请稍后重试。';
                        break;
                    case plupload.HTTP_ERROR:
                        var errorObj = that.util.parse_json(err.response);
                        var errorText = errorObj.error;
                        switch (err.status) {
                            case 400:
                                error = "请求报文格式错误。";
                                break;
                            case 401:
                                error = "客户端认证授权失败。请重试或提交反馈。";
                                break;
                            case 405:
                                error = "客户端请求错误。请重试或提交反馈。";
                                break;
                            case 579:
                                error = "资源上传成功，但回调失败。";
                                break;
                            case 599:
                                error = "网络连接异常。请重试或提交反馈。";
                                break;
                            case 614:
                                error = "文件已存在。";
                                try {
                                    errorObj = that.util.parse_json(errorObj.error);
                                    errorText = errorObj.error || 'file exists';
                                } catch (e) {
                                    errorText = errorObj.error || 'file exists';
                                }
                                break;
                            case 631:
                                error = "指定空间不存在。";
                                break;
                            case 701:
                                error = "上传数据块校验出错。请重试或提交反馈。";
                                break;
                            default:
                                error = "未知错误。";
                                break;
                        }
                        error = error + '(' + err.status + '：' + errorText + ')';
                        break;
                    case plupload.SECURITY_ERROR:
                        error = '安全配置错误。请联系网站管理员。';
                        break;
                    case plupload.GENERIC_ERROR:
                        error = '上传失败。请稍后再试。';
                        break;
                    case plupload.IO_ERROR:
                        error = '上传失败。请稍后再试。';
                        break;
                    case plupload.INIT_ERROR:
                        error = '网站配置错误。请联系网站管理员。';
                        uploader.destroy();
                        break;
                    default:
                        error = err.message + err.details;
                        break;
                }
                up.setOption('error', error);
            }
            up.refresh(); // Reposition Flash/Silverlight
        });

        uploader.bind('FileUploaded', function(up, file, info) {
            var res = that.util.parse_json(info.response);
            ctx = ctx ? ctx : res.ctx;
            if (ctx) {
                qiniu.make_file(up, file, key_func);
            } else {
                qiniu.success(up, file, info.response);
            }
        });

        return uploader;
    }

    exports.Qiniu = Qiniu;
})(window, plupload, mOxie);
