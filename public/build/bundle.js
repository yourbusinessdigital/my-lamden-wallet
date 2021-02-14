
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    var _nodeResolve_empty = {};

    var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

    var naclFast = createCommonjsModule(function (module) {
    (function(nacl) {

    // Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
    // Public domain.
    //
    // Implementation derived from TweetNaCl version 20140427.
    // See for details: http://tweetnacl.cr.yp.to/

    var gf = function(init) {
      var i, r = new Float64Array(16);
      if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
      return r;
    };

    //  Pluggable, initialized in high-level API below.
    var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

    var _0 = new Uint8Array(16);
    var _9 = new Uint8Array(32); _9[0] = 9;

    var gf0 = gf(),
        gf1 = gf([1]),
        _121665 = gf([0xdb41, 1]),
        D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
        D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
        X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
        Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
        I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

    function ts64(x, i, h, l) {
      x[i]   = (h >> 24) & 0xff;
      x[i+1] = (h >> 16) & 0xff;
      x[i+2] = (h >>  8) & 0xff;
      x[i+3] = h & 0xff;
      x[i+4] = (l >> 24)  & 0xff;
      x[i+5] = (l >> 16)  & 0xff;
      x[i+6] = (l >>  8)  & 0xff;
      x[i+7] = l & 0xff;
    }

    function vn(x, xi, y, yi, n) {
      var i,d = 0;
      for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
      return (1 & ((d - 1) >>> 8)) - 1;
    }

    function crypto_verify_16(x, xi, y, yi) {
      return vn(x,xi,y,yi,16);
    }

    function crypto_verify_32(x, xi, y, yi) {
      return vn(x,xi,y,yi,32);
    }

    function core_salsa20(o, p, k, c) {
      var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
          j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
          j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
          j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
          j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
          j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
          j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
          j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
          j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
          j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
          j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
          j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
          j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
          j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
          j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
          j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

      var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
          x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
          x15 = j15, u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u<<7 | u>>>(32-7);
        u = x4 + x0 | 0;
        x8 ^= u<<9 | u>>>(32-9);
        u = x8 + x4 | 0;
        x12 ^= u<<13 | u>>>(32-13);
        u = x12 + x8 | 0;
        x0 ^= u<<18 | u>>>(32-18);

        u = x5 + x1 | 0;
        x9 ^= u<<7 | u>>>(32-7);
        u = x9 + x5 | 0;
        x13 ^= u<<9 | u>>>(32-9);
        u = x13 + x9 | 0;
        x1 ^= u<<13 | u>>>(32-13);
        u = x1 + x13 | 0;
        x5 ^= u<<18 | u>>>(32-18);

        u = x10 + x6 | 0;
        x14 ^= u<<7 | u>>>(32-7);
        u = x14 + x10 | 0;
        x2 ^= u<<9 | u>>>(32-9);
        u = x2 + x14 | 0;
        x6 ^= u<<13 | u>>>(32-13);
        u = x6 + x2 | 0;
        x10 ^= u<<18 | u>>>(32-18);

        u = x15 + x11 | 0;
        x3 ^= u<<7 | u>>>(32-7);
        u = x3 + x15 | 0;
        x7 ^= u<<9 | u>>>(32-9);
        u = x7 + x3 | 0;
        x11 ^= u<<13 | u>>>(32-13);
        u = x11 + x7 | 0;
        x15 ^= u<<18 | u>>>(32-18);

        u = x0 + x3 | 0;
        x1 ^= u<<7 | u>>>(32-7);
        u = x1 + x0 | 0;
        x2 ^= u<<9 | u>>>(32-9);
        u = x2 + x1 | 0;
        x3 ^= u<<13 | u>>>(32-13);
        u = x3 + x2 | 0;
        x0 ^= u<<18 | u>>>(32-18);

        u = x5 + x4 | 0;
        x6 ^= u<<7 | u>>>(32-7);
        u = x6 + x5 | 0;
        x7 ^= u<<9 | u>>>(32-9);
        u = x7 + x6 | 0;
        x4 ^= u<<13 | u>>>(32-13);
        u = x4 + x7 | 0;
        x5 ^= u<<18 | u>>>(32-18);

        u = x10 + x9 | 0;
        x11 ^= u<<7 | u>>>(32-7);
        u = x11 + x10 | 0;
        x8 ^= u<<9 | u>>>(32-9);
        u = x8 + x11 | 0;
        x9 ^= u<<13 | u>>>(32-13);
        u = x9 + x8 | 0;
        x10 ^= u<<18 | u>>>(32-18);

        u = x15 + x14 | 0;
        x12 ^= u<<7 | u>>>(32-7);
        u = x12 + x15 | 0;
        x13 ^= u<<9 | u>>>(32-9);
        u = x13 + x12 | 0;
        x14 ^= u<<13 | u>>>(32-13);
        u = x14 + x13 | 0;
        x15 ^= u<<18 | u>>>(32-18);
      }
       x0 =  x0 +  j0 | 0;
       x1 =  x1 +  j1 | 0;
       x2 =  x2 +  j2 | 0;
       x3 =  x3 +  j3 | 0;
       x4 =  x4 +  j4 | 0;
       x5 =  x5 +  j5 | 0;
       x6 =  x6 +  j6 | 0;
       x7 =  x7 +  j7 | 0;
       x8 =  x8 +  j8 | 0;
       x9 =  x9 +  j9 | 0;
      x10 = x10 + j10 | 0;
      x11 = x11 + j11 | 0;
      x12 = x12 + j12 | 0;
      x13 = x13 + j13 | 0;
      x14 = x14 + j14 | 0;
      x15 = x15 + j15 | 0;

      o[ 0] = x0 >>>  0 & 0xff;
      o[ 1] = x0 >>>  8 & 0xff;
      o[ 2] = x0 >>> 16 & 0xff;
      o[ 3] = x0 >>> 24 & 0xff;

      o[ 4] = x1 >>>  0 & 0xff;
      o[ 5] = x1 >>>  8 & 0xff;
      o[ 6] = x1 >>> 16 & 0xff;
      o[ 7] = x1 >>> 24 & 0xff;

      o[ 8] = x2 >>>  0 & 0xff;
      o[ 9] = x2 >>>  8 & 0xff;
      o[10] = x2 >>> 16 & 0xff;
      o[11] = x2 >>> 24 & 0xff;

      o[12] = x3 >>>  0 & 0xff;
      o[13] = x3 >>>  8 & 0xff;
      o[14] = x3 >>> 16 & 0xff;
      o[15] = x3 >>> 24 & 0xff;

      o[16] = x4 >>>  0 & 0xff;
      o[17] = x4 >>>  8 & 0xff;
      o[18] = x4 >>> 16 & 0xff;
      o[19] = x4 >>> 24 & 0xff;

      o[20] = x5 >>>  0 & 0xff;
      o[21] = x5 >>>  8 & 0xff;
      o[22] = x5 >>> 16 & 0xff;
      o[23] = x5 >>> 24 & 0xff;

      o[24] = x6 >>>  0 & 0xff;
      o[25] = x6 >>>  8 & 0xff;
      o[26] = x6 >>> 16 & 0xff;
      o[27] = x6 >>> 24 & 0xff;

      o[28] = x7 >>>  0 & 0xff;
      o[29] = x7 >>>  8 & 0xff;
      o[30] = x7 >>> 16 & 0xff;
      o[31] = x7 >>> 24 & 0xff;

      o[32] = x8 >>>  0 & 0xff;
      o[33] = x8 >>>  8 & 0xff;
      o[34] = x8 >>> 16 & 0xff;
      o[35] = x8 >>> 24 & 0xff;

      o[36] = x9 >>>  0 & 0xff;
      o[37] = x9 >>>  8 & 0xff;
      o[38] = x9 >>> 16 & 0xff;
      o[39] = x9 >>> 24 & 0xff;

      o[40] = x10 >>>  0 & 0xff;
      o[41] = x10 >>>  8 & 0xff;
      o[42] = x10 >>> 16 & 0xff;
      o[43] = x10 >>> 24 & 0xff;

      o[44] = x11 >>>  0 & 0xff;
      o[45] = x11 >>>  8 & 0xff;
      o[46] = x11 >>> 16 & 0xff;
      o[47] = x11 >>> 24 & 0xff;

      o[48] = x12 >>>  0 & 0xff;
      o[49] = x12 >>>  8 & 0xff;
      o[50] = x12 >>> 16 & 0xff;
      o[51] = x12 >>> 24 & 0xff;

      o[52] = x13 >>>  0 & 0xff;
      o[53] = x13 >>>  8 & 0xff;
      o[54] = x13 >>> 16 & 0xff;
      o[55] = x13 >>> 24 & 0xff;

      o[56] = x14 >>>  0 & 0xff;
      o[57] = x14 >>>  8 & 0xff;
      o[58] = x14 >>> 16 & 0xff;
      o[59] = x14 >>> 24 & 0xff;

      o[60] = x15 >>>  0 & 0xff;
      o[61] = x15 >>>  8 & 0xff;
      o[62] = x15 >>> 16 & 0xff;
      o[63] = x15 >>> 24 & 0xff;
    }

    function core_hsalsa20(o,p,k,c) {
      var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
          j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
          j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
          j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
          j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
          j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
          j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
          j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
          j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
          j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
          j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
          j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
          j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
          j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
          j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
          j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

      var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
          x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
          x15 = j15, u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u<<7 | u>>>(32-7);
        u = x4 + x0 | 0;
        x8 ^= u<<9 | u>>>(32-9);
        u = x8 + x4 | 0;
        x12 ^= u<<13 | u>>>(32-13);
        u = x12 + x8 | 0;
        x0 ^= u<<18 | u>>>(32-18);

        u = x5 + x1 | 0;
        x9 ^= u<<7 | u>>>(32-7);
        u = x9 + x5 | 0;
        x13 ^= u<<9 | u>>>(32-9);
        u = x13 + x9 | 0;
        x1 ^= u<<13 | u>>>(32-13);
        u = x1 + x13 | 0;
        x5 ^= u<<18 | u>>>(32-18);

        u = x10 + x6 | 0;
        x14 ^= u<<7 | u>>>(32-7);
        u = x14 + x10 | 0;
        x2 ^= u<<9 | u>>>(32-9);
        u = x2 + x14 | 0;
        x6 ^= u<<13 | u>>>(32-13);
        u = x6 + x2 | 0;
        x10 ^= u<<18 | u>>>(32-18);

        u = x15 + x11 | 0;
        x3 ^= u<<7 | u>>>(32-7);
        u = x3 + x15 | 0;
        x7 ^= u<<9 | u>>>(32-9);
        u = x7 + x3 | 0;
        x11 ^= u<<13 | u>>>(32-13);
        u = x11 + x7 | 0;
        x15 ^= u<<18 | u>>>(32-18);

        u = x0 + x3 | 0;
        x1 ^= u<<7 | u>>>(32-7);
        u = x1 + x0 | 0;
        x2 ^= u<<9 | u>>>(32-9);
        u = x2 + x1 | 0;
        x3 ^= u<<13 | u>>>(32-13);
        u = x3 + x2 | 0;
        x0 ^= u<<18 | u>>>(32-18);

        u = x5 + x4 | 0;
        x6 ^= u<<7 | u>>>(32-7);
        u = x6 + x5 | 0;
        x7 ^= u<<9 | u>>>(32-9);
        u = x7 + x6 | 0;
        x4 ^= u<<13 | u>>>(32-13);
        u = x4 + x7 | 0;
        x5 ^= u<<18 | u>>>(32-18);

        u = x10 + x9 | 0;
        x11 ^= u<<7 | u>>>(32-7);
        u = x11 + x10 | 0;
        x8 ^= u<<9 | u>>>(32-9);
        u = x8 + x11 | 0;
        x9 ^= u<<13 | u>>>(32-13);
        u = x9 + x8 | 0;
        x10 ^= u<<18 | u>>>(32-18);

        u = x15 + x14 | 0;
        x12 ^= u<<7 | u>>>(32-7);
        u = x12 + x15 | 0;
        x13 ^= u<<9 | u>>>(32-9);
        u = x13 + x12 | 0;
        x14 ^= u<<13 | u>>>(32-13);
        u = x14 + x13 | 0;
        x15 ^= u<<18 | u>>>(32-18);
      }

      o[ 0] = x0 >>>  0 & 0xff;
      o[ 1] = x0 >>>  8 & 0xff;
      o[ 2] = x0 >>> 16 & 0xff;
      o[ 3] = x0 >>> 24 & 0xff;

      o[ 4] = x5 >>>  0 & 0xff;
      o[ 5] = x5 >>>  8 & 0xff;
      o[ 6] = x5 >>> 16 & 0xff;
      o[ 7] = x5 >>> 24 & 0xff;

      o[ 8] = x10 >>>  0 & 0xff;
      o[ 9] = x10 >>>  8 & 0xff;
      o[10] = x10 >>> 16 & 0xff;
      o[11] = x10 >>> 24 & 0xff;

      o[12] = x15 >>>  0 & 0xff;
      o[13] = x15 >>>  8 & 0xff;
      o[14] = x15 >>> 16 & 0xff;
      o[15] = x15 >>> 24 & 0xff;

      o[16] = x6 >>>  0 & 0xff;
      o[17] = x6 >>>  8 & 0xff;
      o[18] = x6 >>> 16 & 0xff;
      o[19] = x6 >>> 24 & 0xff;

      o[20] = x7 >>>  0 & 0xff;
      o[21] = x7 >>>  8 & 0xff;
      o[22] = x7 >>> 16 & 0xff;
      o[23] = x7 >>> 24 & 0xff;

      o[24] = x8 >>>  0 & 0xff;
      o[25] = x8 >>>  8 & 0xff;
      o[26] = x8 >>> 16 & 0xff;
      o[27] = x8 >>> 24 & 0xff;

      o[28] = x9 >>>  0 & 0xff;
      o[29] = x9 >>>  8 & 0xff;
      o[30] = x9 >>> 16 & 0xff;
      o[31] = x9 >>> 24 & 0xff;
    }

    function crypto_core_salsa20(out,inp,k,c) {
      core_salsa20(out,inp,k,c);
    }

    function crypto_core_hsalsa20(out,inp,k,c) {
      core_hsalsa20(out,inp,k,c);
    }

    var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
                // "expand 32-byte k"

    function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
      var z = new Uint8Array(16), x = new Uint8Array(64);
      var u, i;
      for (i = 0; i < 16; i++) z[i] = 0;
      for (i = 0; i < 8; i++) z[i] = n[i];
      while (b >= 64) {
        crypto_core_salsa20(x,z,k,sigma);
        for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
        u = 1;
        for (i = 8; i < 16; i++) {
          u = u + (z[i] & 0xff) | 0;
          z[i] = u & 0xff;
          u >>>= 8;
        }
        b -= 64;
        cpos += 64;
        mpos += 64;
      }
      if (b > 0) {
        crypto_core_salsa20(x,z,k,sigma);
        for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
      }
      return 0;
    }

    function crypto_stream_salsa20(c,cpos,b,n,k) {
      var z = new Uint8Array(16), x = new Uint8Array(64);
      var u, i;
      for (i = 0; i < 16; i++) z[i] = 0;
      for (i = 0; i < 8; i++) z[i] = n[i];
      while (b >= 64) {
        crypto_core_salsa20(x,z,k,sigma);
        for (i = 0; i < 64; i++) c[cpos+i] = x[i];
        u = 1;
        for (i = 8; i < 16; i++) {
          u = u + (z[i] & 0xff) | 0;
          z[i] = u & 0xff;
          u >>>= 8;
        }
        b -= 64;
        cpos += 64;
      }
      if (b > 0) {
        crypto_core_salsa20(x,z,k,sigma);
        for (i = 0; i < b; i++) c[cpos+i] = x[i];
      }
      return 0;
    }

    function crypto_stream(c,cpos,d,n,k) {
      var s = new Uint8Array(32);
      crypto_core_hsalsa20(s,n,k,sigma);
      var sn = new Uint8Array(8);
      for (var i = 0; i < 8; i++) sn[i] = n[i+16];
      return crypto_stream_salsa20(c,cpos,d,sn,s);
    }

    function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
      var s = new Uint8Array(32);
      crypto_core_hsalsa20(s,n,k,sigma);
      var sn = new Uint8Array(8);
      for (var i = 0; i < 8; i++) sn[i] = n[i+16];
      return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
    }

    /*
    * Port of Andrew Moon's Poly1305-donna-16. Public domain.
    * https://github.com/floodyberry/poly1305-donna
    */

    var poly1305 = function(key) {
      this.buffer = new Uint8Array(16);
      this.r = new Uint16Array(10);
      this.h = new Uint16Array(10);
      this.pad = new Uint16Array(8);
      this.leftover = 0;
      this.fin = 0;

      var t0, t1, t2, t3, t4, t5, t6, t7;

      t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
      t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
      t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
      t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
      t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
      this.r[5] = ((t4 >>>  1)) & 0x1ffe;
      t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
      t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
      t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
      this.r[9] = ((t7 >>>  5)) & 0x007f;

      this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
      this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
      this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
      this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
      this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
      this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
      this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
      this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
    };

    poly1305.prototype.blocks = function(m, mpos, bytes) {
      var hibit = this.fin ? 0 : (1 << 11);
      var t0, t1, t2, t3, t4, t5, t6, t7, c;
      var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

      var h0 = this.h[0],
          h1 = this.h[1],
          h2 = this.h[2],
          h3 = this.h[3],
          h4 = this.h[4],
          h5 = this.h[5],
          h6 = this.h[6],
          h7 = this.h[7],
          h8 = this.h[8],
          h9 = this.h[9];

      var r0 = this.r[0],
          r1 = this.r[1],
          r2 = this.r[2],
          r3 = this.r[3],
          r4 = this.r[4],
          r5 = this.r[5],
          r6 = this.r[6],
          r7 = this.r[7],
          r8 = this.r[8],
          r9 = this.r[9];

      while (bytes >= 16) {
        t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
        t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
        t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
        t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
        t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
        h5 += ((t4 >>>  1)) & 0x1fff;
        t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
        t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
        t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
        h9 += ((t7 >>> 5)) | hibit;

        c = 0;

        d0 = c;
        d0 += h0 * r0;
        d0 += h1 * (5 * r9);
        d0 += h2 * (5 * r8);
        d0 += h3 * (5 * r7);
        d0 += h4 * (5 * r6);
        c = (d0 >>> 13); d0 &= 0x1fff;
        d0 += h5 * (5 * r5);
        d0 += h6 * (5 * r4);
        d0 += h7 * (5 * r3);
        d0 += h8 * (5 * r2);
        d0 += h9 * (5 * r1);
        c += (d0 >>> 13); d0 &= 0x1fff;

        d1 = c;
        d1 += h0 * r1;
        d1 += h1 * r0;
        d1 += h2 * (5 * r9);
        d1 += h3 * (5 * r8);
        d1 += h4 * (5 * r7);
        c = (d1 >>> 13); d1 &= 0x1fff;
        d1 += h5 * (5 * r6);
        d1 += h6 * (5 * r5);
        d1 += h7 * (5 * r4);
        d1 += h8 * (5 * r3);
        d1 += h9 * (5 * r2);
        c += (d1 >>> 13); d1 &= 0x1fff;

        d2 = c;
        d2 += h0 * r2;
        d2 += h1 * r1;
        d2 += h2 * r0;
        d2 += h3 * (5 * r9);
        d2 += h4 * (5 * r8);
        c = (d2 >>> 13); d2 &= 0x1fff;
        d2 += h5 * (5 * r7);
        d2 += h6 * (5 * r6);
        d2 += h7 * (5 * r5);
        d2 += h8 * (5 * r4);
        d2 += h9 * (5 * r3);
        c += (d2 >>> 13); d2 &= 0x1fff;

        d3 = c;
        d3 += h0 * r3;
        d3 += h1 * r2;
        d3 += h2 * r1;
        d3 += h3 * r0;
        d3 += h4 * (5 * r9);
        c = (d3 >>> 13); d3 &= 0x1fff;
        d3 += h5 * (5 * r8);
        d3 += h6 * (5 * r7);
        d3 += h7 * (5 * r6);
        d3 += h8 * (5 * r5);
        d3 += h9 * (5 * r4);
        c += (d3 >>> 13); d3 &= 0x1fff;

        d4 = c;
        d4 += h0 * r4;
        d4 += h1 * r3;
        d4 += h2 * r2;
        d4 += h3 * r1;
        d4 += h4 * r0;
        c = (d4 >>> 13); d4 &= 0x1fff;
        d4 += h5 * (5 * r9);
        d4 += h6 * (5 * r8);
        d4 += h7 * (5 * r7);
        d4 += h8 * (5 * r6);
        d4 += h9 * (5 * r5);
        c += (d4 >>> 13); d4 &= 0x1fff;

        d5 = c;
        d5 += h0 * r5;
        d5 += h1 * r4;
        d5 += h2 * r3;
        d5 += h3 * r2;
        d5 += h4 * r1;
        c = (d5 >>> 13); d5 &= 0x1fff;
        d5 += h5 * r0;
        d5 += h6 * (5 * r9);
        d5 += h7 * (5 * r8);
        d5 += h8 * (5 * r7);
        d5 += h9 * (5 * r6);
        c += (d5 >>> 13); d5 &= 0x1fff;

        d6 = c;
        d6 += h0 * r6;
        d6 += h1 * r5;
        d6 += h2 * r4;
        d6 += h3 * r3;
        d6 += h4 * r2;
        c = (d6 >>> 13); d6 &= 0x1fff;
        d6 += h5 * r1;
        d6 += h6 * r0;
        d6 += h7 * (5 * r9);
        d6 += h8 * (5 * r8);
        d6 += h9 * (5 * r7);
        c += (d6 >>> 13); d6 &= 0x1fff;

        d7 = c;
        d7 += h0 * r7;
        d7 += h1 * r6;
        d7 += h2 * r5;
        d7 += h3 * r4;
        d7 += h4 * r3;
        c = (d7 >>> 13); d7 &= 0x1fff;
        d7 += h5 * r2;
        d7 += h6 * r1;
        d7 += h7 * r0;
        d7 += h8 * (5 * r9);
        d7 += h9 * (5 * r8);
        c += (d7 >>> 13); d7 &= 0x1fff;

        d8 = c;
        d8 += h0 * r8;
        d8 += h1 * r7;
        d8 += h2 * r6;
        d8 += h3 * r5;
        d8 += h4 * r4;
        c = (d8 >>> 13); d8 &= 0x1fff;
        d8 += h5 * r3;
        d8 += h6 * r2;
        d8 += h7 * r1;
        d8 += h8 * r0;
        d8 += h9 * (5 * r9);
        c += (d8 >>> 13); d8 &= 0x1fff;

        d9 = c;
        d9 += h0 * r9;
        d9 += h1 * r8;
        d9 += h2 * r7;
        d9 += h3 * r6;
        d9 += h4 * r5;
        c = (d9 >>> 13); d9 &= 0x1fff;
        d9 += h5 * r4;
        d9 += h6 * r3;
        d9 += h7 * r2;
        d9 += h8 * r1;
        d9 += h9 * r0;
        c += (d9 >>> 13); d9 &= 0x1fff;

        c = (((c << 2) + c)) | 0;
        c = (c + d0) | 0;
        d0 = c & 0x1fff;
        c = (c >>> 13);
        d1 += c;

        h0 = d0;
        h1 = d1;
        h2 = d2;
        h3 = d3;
        h4 = d4;
        h5 = d5;
        h6 = d6;
        h7 = d7;
        h8 = d8;
        h9 = d9;

        mpos += 16;
        bytes -= 16;
      }
      this.h[0] = h0;
      this.h[1] = h1;
      this.h[2] = h2;
      this.h[3] = h3;
      this.h[4] = h4;
      this.h[5] = h5;
      this.h[6] = h6;
      this.h[7] = h7;
      this.h[8] = h8;
      this.h[9] = h9;
    };

    poly1305.prototype.finish = function(mac, macpos) {
      var g = new Uint16Array(10);
      var c, mask, f, i;

      if (this.leftover) {
        i = this.leftover;
        this.buffer[i++] = 1;
        for (; i < 16; i++) this.buffer[i] = 0;
        this.fin = 1;
        this.blocks(this.buffer, 0, 16);
      }

      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      for (i = 2; i < 10; i++) {
        this.h[i] += c;
        c = this.h[i] >>> 13;
        this.h[i] &= 0x1fff;
      }
      this.h[0] += (c * 5);
      c = this.h[0] >>> 13;
      this.h[0] &= 0x1fff;
      this.h[1] += c;
      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      this.h[2] += c;

      g[0] = this.h[0] + 5;
      c = g[0] >>> 13;
      g[0] &= 0x1fff;
      for (i = 1; i < 10; i++) {
        g[i] = this.h[i] + c;
        c = g[i] >>> 13;
        g[i] &= 0x1fff;
      }
      g[9] -= (1 << 13);

      mask = (c ^ 1) - 1;
      for (i = 0; i < 10; i++) g[i] &= mask;
      mask = ~mask;
      for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

      this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
      this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
      this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
      this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
      this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
      this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
      this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
      this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

      f = this.h[0] + this.pad[0];
      this.h[0] = f & 0xffff;
      for (i = 1; i < 8; i++) {
        f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
        this.h[i] = f & 0xffff;
      }

      mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
      mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
      mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
      mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
      mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
      mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
      mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
      mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
      mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
      mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
      mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
      mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
      mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
      mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
      mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
      mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
    };

    poly1305.prototype.update = function(m, mpos, bytes) {
      var i, want;

      if (this.leftover) {
        want = (16 - this.leftover);
        if (want > bytes)
          want = bytes;
        for (i = 0; i < want; i++)
          this.buffer[this.leftover + i] = m[mpos+i];
        bytes -= want;
        mpos += want;
        this.leftover += want;
        if (this.leftover < 16)
          return;
        this.blocks(this.buffer, 0, 16);
        this.leftover = 0;
      }

      if (bytes >= 16) {
        want = bytes - (bytes % 16);
        this.blocks(m, mpos, want);
        mpos += want;
        bytes -= want;
      }

      if (bytes) {
        for (i = 0; i < bytes; i++)
          this.buffer[this.leftover + i] = m[mpos+i];
        this.leftover += bytes;
      }
    };

    function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
      var s = new poly1305(k);
      s.update(m, mpos, n);
      s.finish(out, outpos);
      return 0;
    }

    function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
      var x = new Uint8Array(16);
      crypto_onetimeauth(x,0,m,mpos,n,k);
      return crypto_verify_16(h,hpos,x,0);
    }

    function crypto_secretbox(c,m,d,n,k) {
      var i;
      if (d < 32) return -1;
      crypto_stream_xor(c,0,m,0,d,n,k);
      crypto_onetimeauth(c, 16, c, 32, d - 32, c);
      for (i = 0; i < 16; i++) c[i] = 0;
      return 0;
    }

    function crypto_secretbox_open(m,c,d,n,k) {
      var i;
      var x = new Uint8Array(32);
      if (d < 32) return -1;
      crypto_stream(x,0,32,n,k);
      if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
      crypto_stream_xor(m,0,c,0,d,n,k);
      for (i = 0; i < 32; i++) m[i] = 0;
      return 0;
    }

    function set25519(r, a) {
      var i;
      for (i = 0; i < 16; i++) r[i] = a[i]|0;
    }

    function car25519(o) {
      var i, v, c = 1;
      for (i = 0; i < 16; i++) {
        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
      }
      o[0] += c-1 + 37 * (c-1);
    }

    function sel25519(p, q, b) {
      var t, c = ~(b-1);
      for (var i = 0; i < 16; i++) {
        t = c & (p[i] ^ q[i]);
        p[i] ^= t;
        q[i] ^= t;
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(), t = gf();
      for (i = 0; i < 16; i++) t[i] = n[i];
      car25519(t);
      car25519(t);
      car25519(t);
      for (j = 0; j < 2; j++) {
        m[0] = t[0] - 0xffed;
        for (i = 1; i < 15; i++) {
          m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
          m[i-1] &= 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
        b = (m[15]>>16) & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1-b);
      }
      for (i = 0; i < 16; i++) {
        o[2*i] = t[i] & 0xff;
        o[2*i+1] = t[i]>>8;
      }
    }

    function neq25519(a, b) {
      var c = new Uint8Array(32), d = new Uint8Array(32);
      pack25519(c, a);
      pack25519(d, b);
      return crypto_verify_32(c, 0, d, 0);
    }

    function par25519(a) {
      var d = new Uint8Array(32);
      pack25519(d, a);
      return d[0] & 1;
    }

    function unpack25519(o, n) {
      var i;
      for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
      o[15] &= 0x7fff;
    }

    function A(o, a, b) {
      for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
    }

    function Z(o, a, b) {
      for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
    }

    function M(o, a, b) {
      var v, c,
         t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
         t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
        t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
        t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
        b0 = b[0],
        b1 = b[1],
        b2 = b[2],
        b3 = b[3],
        b4 = b[4],
        b5 = b[5],
        b6 = b[6],
        b7 = b[7],
        b8 = b[8],
        b9 = b[9],
        b10 = b[10],
        b11 = b[11],
        b12 = b[12],
        b13 = b[13],
        b14 = b[14],
        b15 = b[15];

      v = a[0];
      t0 += v * b0;
      t1 += v * b1;
      t2 += v * b2;
      t3 += v * b3;
      t4 += v * b4;
      t5 += v * b5;
      t6 += v * b6;
      t7 += v * b7;
      t8 += v * b8;
      t9 += v * b9;
      t10 += v * b10;
      t11 += v * b11;
      t12 += v * b12;
      t13 += v * b13;
      t14 += v * b14;
      t15 += v * b15;
      v = a[1];
      t1 += v * b0;
      t2 += v * b1;
      t3 += v * b2;
      t4 += v * b3;
      t5 += v * b4;
      t6 += v * b5;
      t7 += v * b6;
      t8 += v * b7;
      t9 += v * b8;
      t10 += v * b9;
      t11 += v * b10;
      t12 += v * b11;
      t13 += v * b12;
      t14 += v * b13;
      t15 += v * b14;
      t16 += v * b15;
      v = a[2];
      t2 += v * b0;
      t3 += v * b1;
      t4 += v * b2;
      t5 += v * b3;
      t6 += v * b4;
      t7 += v * b5;
      t8 += v * b6;
      t9 += v * b7;
      t10 += v * b8;
      t11 += v * b9;
      t12 += v * b10;
      t13 += v * b11;
      t14 += v * b12;
      t15 += v * b13;
      t16 += v * b14;
      t17 += v * b15;
      v = a[3];
      t3 += v * b0;
      t4 += v * b1;
      t5 += v * b2;
      t6 += v * b3;
      t7 += v * b4;
      t8 += v * b5;
      t9 += v * b6;
      t10 += v * b7;
      t11 += v * b8;
      t12 += v * b9;
      t13 += v * b10;
      t14 += v * b11;
      t15 += v * b12;
      t16 += v * b13;
      t17 += v * b14;
      t18 += v * b15;
      v = a[4];
      t4 += v * b0;
      t5 += v * b1;
      t6 += v * b2;
      t7 += v * b3;
      t8 += v * b4;
      t9 += v * b5;
      t10 += v * b6;
      t11 += v * b7;
      t12 += v * b8;
      t13 += v * b9;
      t14 += v * b10;
      t15 += v * b11;
      t16 += v * b12;
      t17 += v * b13;
      t18 += v * b14;
      t19 += v * b15;
      v = a[5];
      t5 += v * b0;
      t6 += v * b1;
      t7 += v * b2;
      t8 += v * b3;
      t9 += v * b4;
      t10 += v * b5;
      t11 += v * b6;
      t12 += v * b7;
      t13 += v * b8;
      t14 += v * b9;
      t15 += v * b10;
      t16 += v * b11;
      t17 += v * b12;
      t18 += v * b13;
      t19 += v * b14;
      t20 += v * b15;
      v = a[6];
      t6 += v * b0;
      t7 += v * b1;
      t8 += v * b2;
      t9 += v * b3;
      t10 += v * b4;
      t11 += v * b5;
      t12 += v * b6;
      t13 += v * b7;
      t14 += v * b8;
      t15 += v * b9;
      t16 += v * b10;
      t17 += v * b11;
      t18 += v * b12;
      t19 += v * b13;
      t20 += v * b14;
      t21 += v * b15;
      v = a[7];
      t7 += v * b0;
      t8 += v * b1;
      t9 += v * b2;
      t10 += v * b3;
      t11 += v * b4;
      t12 += v * b5;
      t13 += v * b6;
      t14 += v * b7;
      t15 += v * b8;
      t16 += v * b9;
      t17 += v * b10;
      t18 += v * b11;
      t19 += v * b12;
      t20 += v * b13;
      t21 += v * b14;
      t22 += v * b15;
      v = a[8];
      t8 += v * b0;
      t9 += v * b1;
      t10 += v * b2;
      t11 += v * b3;
      t12 += v * b4;
      t13 += v * b5;
      t14 += v * b6;
      t15 += v * b7;
      t16 += v * b8;
      t17 += v * b9;
      t18 += v * b10;
      t19 += v * b11;
      t20 += v * b12;
      t21 += v * b13;
      t22 += v * b14;
      t23 += v * b15;
      v = a[9];
      t9 += v * b0;
      t10 += v * b1;
      t11 += v * b2;
      t12 += v * b3;
      t13 += v * b4;
      t14 += v * b5;
      t15 += v * b6;
      t16 += v * b7;
      t17 += v * b8;
      t18 += v * b9;
      t19 += v * b10;
      t20 += v * b11;
      t21 += v * b12;
      t22 += v * b13;
      t23 += v * b14;
      t24 += v * b15;
      v = a[10];
      t10 += v * b0;
      t11 += v * b1;
      t12 += v * b2;
      t13 += v * b3;
      t14 += v * b4;
      t15 += v * b5;
      t16 += v * b6;
      t17 += v * b7;
      t18 += v * b8;
      t19 += v * b9;
      t20 += v * b10;
      t21 += v * b11;
      t22 += v * b12;
      t23 += v * b13;
      t24 += v * b14;
      t25 += v * b15;
      v = a[11];
      t11 += v * b0;
      t12 += v * b1;
      t13 += v * b2;
      t14 += v * b3;
      t15 += v * b4;
      t16 += v * b5;
      t17 += v * b6;
      t18 += v * b7;
      t19 += v * b8;
      t20 += v * b9;
      t21 += v * b10;
      t22 += v * b11;
      t23 += v * b12;
      t24 += v * b13;
      t25 += v * b14;
      t26 += v * b15;
      v = a[12];
      t12 += v * b0;
      t13 += v * b1;
      t14 += v * b2;
      t15 += v * b3;
      t16 += v * b4;
      t17 += v * b5;
      t18 += v * b6;
      t19 += v * b7;
      t20 += v * b8;
      t21 += v * b9;
      t22 += v * b10;
      t23 += v * b11;
      t24 += v * b12;
      t25 += v * b13;
      t26 += v * b14;
      t27 += v * b15;
      v = a[13];
      t13 += v * b0;
      t14 += v * b1;
      t15 += v * b2;
      t16 += v * b3;
      t17 += v * b4;
      t18 += v * b5;
      t19 += v * b6;
      t20 += v * b7;
      t21 += v * b8;
      t22 += v * b9;
      t23 += v * b10;
      t24 += v * b11;
      t25 += v * b12;
      t26 += v * b13;
      t27 += v * b14;
      t28 += v * b15;
      v = a[14];
      t14 += v * b0;
      t15 += v * b1;
      t16 += v * b2;
      t17 += v * b3;
      t18 += v * b4;
      t19 += v * b5;
      t20 += v * b6;
      t21 += v * b7;
      t22 += v * b8;
      t23 += v * b9;
      t24 += v * b10;
      t25 += v * b11;
      t26 += v * b12;
      t27 += v * b13;
      t28 += v * b14;
      t29 += v * b15;
      v = a[15];
      t15 += v * b0;
      t16 += v * b1;
      t17 += v * b2;
      t18 += v * b3;
      t19 += v * b4;
      t20 += v * b5;
      t21 += v * b6;
      t22 += v * b7;
      t23 += v * b8;
      t24 += v * b9;
      t25 += v * b10;
      t26 += v * b11;
      t27 += v * b12;
      t28 += v * b13;
      t29 += v * b14;
      t30 += v * b15;

      t0  += 38 * t16;
      t1  += 38 * t17;
      t2  += 38 * t18;
      t3  += 38 * t19;
      t4  += 38 * t20;
      t5  += 38 * t21;
      t6  += 38 * t22;
      t7  += 38 * t23;
      t8  += 38 * t24;
      t9  += 38 * t25;
      t10 += 38 * t26;
      t11 += 38 * t27;
      t12 += 38 * t28;
      t13 += 38 * t29;
      t14 += 38 * t30;
      // t15 left as is

      // first car
      c = 1;
      v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
      v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
      v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
      v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
      v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
      v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
      v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
      v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
      v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
      v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
      v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
      v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
      v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
      v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
      v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
      v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
      t0 += c-1 + 37 * (c-1);

      // second car
      c = 1;
      v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
      v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
      v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
      v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
      v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
      v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
      v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
      v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
      v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
      v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
      v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
      v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
      v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
      v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
      v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
      v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
      t0 += c-1 + 37 * (c-1);

      o[ 0] = t0;
      o[ 1] = t1;
      o[ 2] = t2;
      o[ 3] = t3;
      o[ 4] = t4;
      o[ 5] = t5;
      o[ 6] = t6;
      o[ 7] = t7;
      o[ 8] = t8;
      o[ 9] = t9;
      o[10] = t10;
      o[11] = t11;
      o[12] = t12;
      o[13] = t13;
      o[14] = t14;
      o[15] = t15;
    }

    function S(o, a) {
      M(o, a, a);
    }

    function inv25519(o, i) {
      var c = gf();
      var a;
      for (a = 0; a < 16; a++) c[a] = i[a];
      for (a = 253; a >= 0; a--) {
        S(c, c);
        if(a !== 2 && a !== 4) M(c, c, i);
      }
      for (a = 0; a < 16; a++) o[a] = c[a];
    }

    function pow2523(o, i) {
      var c = gf();
      var a;
      for (a = 0; a < 16; a++) c[a] = i[a];
      for (a = 250; a >= 0; a--) {
          S(c, c);
          if(a !== 1) M(c, c, i);
      }
      for (a = 0; a < 16; a++) o[a] = c[a];
    }

    function crypto_scalarmult(q, n, p) {
      var z = new Uint8Array(32);
      var x = new Float64Array(80), r, i;
      var a = gf(), b = gf(), c = gf(),
          d = gf(), e = gf(), f = gf();
      for (i = 0; i < 31; i++) z[i] = n[i];
      z[31]=(n[31]&127)|64;
      z[0]&=248;
      unpack25519(x,p);
      for (i = 0; i < 16; i++) {
        b[i]=x[i];
        d[i]=a[i]=c[i]=0;
      }
      a[0]=d[0]=1;
      for (i=254; i>=0; --i) {
        r=(z[i>>>3]>>>(i&7))&1;
        sel25519(a,b,r);
        sel25519(c,d,r);
        A(e,a,c);
        Z(a,a,c);
        A(c,b,d);
        Z(b,b,d);
        S(d,e);
        S(f,a);
        M(a,c,a);
        M(c,b,e);
        A(e,a,c);
        Z(a,a,c);
        S(b,a);
        Z(c,d,f);
        M(a,c,_121665);
        A(a,a,d);
        M(c,c,a);
        M(a,d,f);
        M(d,b,x);
        S(b,e);
        sel25519(a,b,r);
        sel25519(c,d,r);
      }
      for (i = 0; i < 16; i++) {
        x[i+16]=a[i];
        x[i+32]=c[i];
        x[i+48]=b[i];
        x[i+64]=d[i];
      }
      var x32 = x.subarray(32);
      var x16 = x.subarray(16);
      inv25519(x32,x32);
      M(x16,x16,x32);
      pack25519(q,x16);
      return 0;
    }

    function crypto_scalarmult_base(q, n) {
      return crypto_scalarmult(q, n, _9);
    }

    function crypto_box_keypair(y, x) {
      randombytes(x, 32);
      return crypto_scalarmult_base(y, x);
    }

    function crypto_box_beforenm(k, y, x) {
      var s = new Uint8Array(32);
      crypto_scalarmult(s, x, y);
      return crypto_core_hsalsa20(k, _0, s, sigma);
    }

    var crypto_box_afternm = crypto_secretbox;
    var crypto_box_open_afternm = crypto_secretbox_open;

    function crypto_box(c, m, d, n, y, x) {
      var k = new Uint8Array(32);
      crypto_box_beforenm(k, y, x);
      return crypto_box_afternm(c, m, d, n, k);
    }

    function crypto_box_open(m, c, d, n, y, x) {
      var k = new Uint8Array(32);
      crypto_box_beforenm(k, y, x);
      return crypto_box_open_afternm(m, c, d, n, k);
    }

    var K = [
      0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
      0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
      0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
      0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
      0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
      0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
      0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
      0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
      0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
      0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
      0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
      0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
      0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
      0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
      0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
      0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
      0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
      0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
      0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
      0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
      0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
      0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
      0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
      0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
      0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
      0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
      0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
      0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
      0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
      0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
      0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
      0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
      0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
      0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
      0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
      0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
      0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
      0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
      0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
      0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
    ];

    function crypto_hashblocks_hl(hh, hl, m, n) {
      var wh = new Int32Array(16), wl = new Int32Array(16),
          bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
          bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
          th, tl, i, j, h, l, a, b, c, d;

      var ah0 = hh[0],
          ah1 = hh[1],
          ah2 = hh[2],
          ah3 = hh[3],
          ah4 = hh[4],
          ah5 = hh[5],
          ah6 = hh[6],
          ah7 = hh[7],

          al0 = hl[0],
          al1 = hl[1],
          al2 = hl[2],
          al3 = hl[3],
          al4 = hl[4],
          al5 = hl[5],
          al6 = hl[6],
          al7 = hl[7];

      var pos = 0;
      while (n >= 128) {
        for (i = 0; i < 16; i++) {
          j = 8 * i + pos;
          wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
          wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
        }
        for (i = 0; i < 80; i++) {
          bh0 = ah0;
          bh1 = ah1;
          bh2 = ah2;
          bh3 = ah3;
          bh4 = ah4;
          bh5 = ah5;
          bh6 = ah6;
          bh7 = ah7;

          bl0 = al0;
          bl1 = al1;
          bl2 = al2;
          bl3 = al3;
          bl4 = al4;
          bl5 = al5;
          bl6 = al6;
          bl7 = al7;

          // add
          h = ah7;
          l = al7;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          // Sigma1
          h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
          l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // Ch
          h = (ah4 & ah5) ^ (~ah4 & ah6);
          l = (al4 & al5) ^ (~al4 & al6);

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // K
          h = K[i*2];
          l = K[i*2+1];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // w
          h = wh[i%16];
          l = wl[i%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          th = c & 0xffff | d << 16;
          tl = a & 0xffff | b << 16;

          // add
          h = th;
          l = tl;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          // Sigma0
          h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
          l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // Maj
          h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
          l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          bh7 = (c & 0xffff) | (d << 16);
          bl7 = (a & 0xffff) | (b << 16);

          // add
          h = bh3;
          l = bl3;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = th;
          l = tl;

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          bh3 = (c & 0xffff) | (d << 16);
          bl3 = (a & 0xffff) | (b << 16);

          ah1 = bh0;
          ah2 = bh1;
          ah3 = bh2;
          ah4 = bh3;
          ah5 = bh4;
          ah6 = bh5;
          ah7 = bh6;
          ah0 = bh7;

          al1 = bl0;
          al2 = bl1;
          al3 = bl2;
          al4 = bl3;
          al5 = bl4;
          al6 = bl5;
          al7 = bl6;
          al0 = bl7;

          if (i%16 === 15) {
            for (j = 0; j < 16; j++) {
              // add
              h = wh[j];
              l = wl[j];

              a = l & 0xffff; b = l >>> 16;
              c = h & 0xffff; d = h >>> 16;

              h = wh[(j+9)%16];
              l = wl[(j+9)%16];

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              // sigma0
              th = wh[(j+1)%16];
              tl = wl[(j+1)%16];
              h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
              l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              // sigma1
              th = wh[(j+14)%16];
              tl = wl[(j+14)%16];
              h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
              l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;

              wh[j] = (c & 0xffff) | (d << 16);
              wl[j] = (a & 0xffff) | (b << 16);
            }
          }
        }

        // add
        h = ah0;
        l = al0;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[0];
        l = hl[0];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[0] = ah0 = (c & 0xffff) | (d << 16);
        hl[0] = al0 = (a & 0xffff) | (b << 16);

        h = ah1;
        l = al1;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[1];
        l = hl[1];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[1] = ah1 = (c & 0xffff) | (d << 16);
        hl[1] = al1 = (a & 0xffff) | (b << 16);

        h = ah2;
        l = al2;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[2];
        l = hl[2];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[2] = ah2 = (c & 0xffff) | (d << 16);
        hl[2] = al2 = (a & 0xffff) | (b << 16);

        h = ah3;
        l = al3;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[3];
        l = hl[3];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[3] = ah3 = (c & 0xffff) | (d << 16);
        hl[3] = al3 = (a & 0xffff) | (b << 16);

        h = ah4;
        l = al4;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[4];
        l = hl[4];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[4] = ah4 = (c & 0xffff) | (d << 16);
        hl[4] = al4 = (a & 0xffff) | (b << 16);

        h = ah5;
        l = al5;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[5];
        l = hl[5];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[5] = ah5 = (c & 0xffff) | (d << 16);
        hl[5] = al5 = (a & 0xffff) | (b << 16);

        h = ah6;
        l = al6;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[6];
        l = hl[6];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[6] = ah6 = (c & 0xffff) | (d << 16);
        hl[6] = al6 = (a & 0xffff) | (b << 16);

        h = ah7;
        l = al7;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[7];
        l = hl[7];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[7] = ah7 = (c & 0xffff) | (d << 16);
        hl[7] = al7 = (a & 0xffff) | (b << 16);

        pos += 128;
        n -= 128;
      }

      return n;
    }

    function crypto_hash(out, m, n) {
      var hh = new Int32Array(8),
          hl = new Int32Array(8),
          x = new Uint8Array(256),
          i, b = n;

      hh[0] = 0x6a09e667;
      hh[1] = 0xbb67ae85;
      hh[2] = 0x3c6ef372;
      hh[3] = 0xa54ff53a;
      hh[4] = 0x510e527f;
      hh[5] = 0x9b05688c;
      hh[6] = 0x1f83d9ab;
      hh[7] = 0x5be0cd19;

      hl[0] = 0xf3bcc908;
      hl[1] = 0x84caa73b;
      hl[2] = 0xfe94f82b;
      hl[3] = 0x5f1d36f1;
      hl[4] = 0xade682d1;
      hl[5] = 0x2b3e6c1f;
      hl[6] = 0xfb41bd6b;
      hl[7] = 0x137e2179;

      crypto_hashblocks_hl(hh, hl, m, n);
      n %= 128;

      for (i = 0; i < n; i++) x[i] = m[b-n+i];
      x[n] = 128;

      n = 256-128*(n<112?1:0);
      x[n-9] = 0;
      ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
      crypto_hashblocks_hl(hh, hl, x, n);

      for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

      return 0;
    }

    function add(p, q) {
      var a = gf(), b = gf(), c = gf(),
          d = gf(), e = gf(), f = gf(),
          g = gf(), h = gf(), t = gf();

      Z(a, p[1], p[0]);
      Z(t, q[1], q[0]);
      M(a, a, t);
      A(b, p[0], p[1]);
      A(t, q[0], q[1]);
      M(b, b, t);
      M(c, p[3], q[3]);
      M(c, c, D2);
      M(d, p[2], q[2]);
      A(d, d, d);
      Z(e, b, a);
      Z(f, d, c);
      A(g, d, c);
      A(h, b, a);

      M(p[0], e, f);
      M(p[1], h, g);
      M(p[2], g, f);
      M(p[3], e, h);
    }

    function cswap(p, q, b) {
      var i;
      for (i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
      }
    }

    function pack(r, p) {
      var tx = gf(), ty = gf(), zi = gf();
      inv25519(zi, p[2]);
      M(tx, p[0], zi);
      M(ty, p[1], zi);
      pack25519(r, ty);
      r[31] ^= par25519(tx) << 7;
    }

    function scalarmult(p, q, s) {
      var b, i;
      set25519(p[0], gf0);
      set25519(p[1], gf1);
      set25519(p[2], gf1);
      set25519(p[3], gf0);
      for (i = 255; i >= 0; --i) {
        b = (s[(i/8)|0] >> (i&7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
      }
    }

    function scalarbase(p, s) {
      var q = [gf(), gf(), gf(), gf()];
      set25519(q[0], X);
      set25519(q[1], Y);
      set25519(q[2], gf1);
      M(q[3], X, Y);
      scalarmult(p, q, s);
    }

    function crypto_sign_keypair(pk, sk, seeded) {
      var d = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()];
      var i;

      if (!seeded) randombytes(sk, 32);
      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;

      scalarbase(p, d);
      pack(pk, p);

      for (i = 0; i < 32; i++) sk[i+32] = pk[i];
      return 0;
    }

    var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

    function modL(r, x) {
      var carry, i, j, k;
      for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
          x[j] += carry - 16 * x[i] * L[j - (i - 32)];
          carry = (x[j] + 128) >> 8;
          x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
      }
      carry = 0;
      for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
      }
      for (j = 0; j < 32; j++) x[j] -= carry * L[j];
      for (i = 0; i < 32; i++) {
        x[i+1] += x[i] >> 8;
        r[i] = x[i] & 255;
      }
    }

    function reduce(r) {
      var x = new Float64Array(64), i;
      for (i = 0; i < 64; i++) x[i] = r[i];
      for (i = 0; i < 64; i++) r[i] = 0;
      modL(r, x);
    }

    // Note: difference from C - smlen returned, not passed as argument.
    function crypto_sign(sm, m, n, sk) {
      var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
      var i, j, x = new Float64Array(64);
      var p = [gf(), gf(), gf(), gf()];

      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;

      var smlen = n + 64;
      for (i = 0; i < n; i++) sm[64 + i] = m[i];
      for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

      crypto_hash(r, sm.subarray(32), n+32);
      reduce(r);
      scalarbase(p, r);
      pack(sm, p);

      for (i = 32; i < 64; i++) sm[i] = sk[i];
      crypto_hash(h, sm, n + 64);
      reduce(h);

      for (i = 0; i < 64; i++) x[i] = 0;
      for (i = 0; i < 32; i++) x[i] = r[i];
      for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
          x[i+j] += h[i] * d[j];
        }
      }

      modL(sm.subarray(32), x);
      return smlen;
    }

    function unpackneg(r, p) {
      var t = gf(), chk = gf(), num = gf(),
          den = gf(), den2 = gf(), den4 = gf(),
          den6 = gf();

      set25519(r[2], gf1);
      unpack25519(r[1], p);
      S(num, r[1]);
      M(den, num, D);
      Z(num, num, r[2]);
      A(den, r[2], den);

      S(den2, den);
      S(den4, den2);
      M(den6, den4, den2);
      M(t, den6, num);
      M(t, t, den);

      pow2523(t, t);
      M(t, t, num);
      M(t, t, den);
      M(t, t, den);
      M(r[0], t, den);

      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) M(r[0], r[0], I);

      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) return -1;

      if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

      M(r[3], r[0], r[1]);
      return 0;
    }

    function crypto_sign_open(m, sm, n, pk) {
      var i, mlen;
      var t = new Uint8Array(32), h = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()],
          q = [gf(), gf(), gf(), gf()];

      mlen = -1;
      if (n < 64) return -1;

      if (unpackneg(q, pk)) return -1;

      for (i = 0; i < n; i++) m[i] = sm[i];
      for (i = 0; i < 32; i++) m[i+32] = pk[i];
      crypto_hash(h, m, n);
      reduce(h);
      scalarmult(p, q, h);

      scalarbase(q, sm.subarray(32));
      add(p, q);
      pack(t, p);

      n -= 64;
      if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++) m[i] = 0;
        return -1;
      }

      for (i = 0; i < n; i++) m[i] = sm[i + 64];
      mlen = n;
      return mlen;
    }

    var crypto_secretbox_KEYBYTES = 32,
        crypto_secretbox_NONCEBYTES = 24,
        crypto_secretbox_ZEROBYTES = 32,
        crypto_secretbox_BOXZEROBYTES = 16,
        crypto_scalarmult_BYTES = 32,
        crypto_scalarmult_SCALARBYTES = 32,
        crypto_box_PUBLICKEYBYTES = 32,
        crypto_box_SECRETKEYBYTES = 32,
        crypto_box_BEFORENMBYTES = 32,
        crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
        crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
        crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
        crypto_sign_BYTES = 64,
        crypto_sign_PUBLICKEYBYTES = 32,
        crypto_sign_SECRETKEYBYTES = 64,
        crypto_sign_SEEDBYTES = 32,
        crypto_hash_BYTES = 64;

    nacl.lowlevel = {
      crypto_core_hsalsa20: crypto_core_hsalsa20,
      crypto_stream_xor: crypto_stream_xor,
      crypto_stream: crypto_stream,
      crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
      crypto_stream_salsa20: crypto_stream_salsa20,
      crypto_onetimeauth: crypto_onetimeauth,
      crypto_onetimeauth_verify: crypto_onetimeauth_verify,
      crypto_verify_16: crypto_verify_16,
      crypto_verify_32: crypto_verify_32,
      crypto_secretbox: crypto_secretbox,
      crypto_secretbox_open: crypto_secretbox_open,
      crypto_scalarmult: crypto_scalarmult,
      crypto_scalarmult_base: crypto_scalarmult_base,
      crypto_box_beforenm: crypto_box_beforenm,
      crypto_box_afternm: crypto_box_afternm,
      crypto_box: crypto_box,
      crypto_box_open: crypto_box_open,
      crypto_box_keypair: crypto_box_keypair,
      crypto_hash: crypto_hash,
      crypto_sign: crypto_sign,
      crypto_sign_keypair: crypto_sign_keypair,
      crypto_sign_open: crypto_sign_open,

      crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
      crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
      crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
      crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
      crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
      crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
      crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
      crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
      crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
      crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
      crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
      crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
      crypto_sign_BYTES: crypto_sign_BYTES,
      crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
      crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
      crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
      crypto_hash_BYTES: crypto_hash_BYTES
    };

    /* High-level API */

    function checkLengths(k, n) {
      if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
      if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
    }

    function checkBoxLengths(pk, sk) {
      if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
      if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
    }

    function checkArrayTypes() {
      for (var i = 0; i < arguments.length; i++) {
        if (!(arguments[i] instanceof Uint8Array))
          throw new TypeError('unexpected type, use Uint8Array');
      }
    }

    function cleanup(arr) {
      for (var i = 0; i < arr.length; i++) arr[i] = 0;
    }

    nacl.randomBytes = function(n) {
      var b = new Uint8Array(n);
      randombytes(b, n);
      return b;
    };

    nacl.secretbox = function(msg, nonce, key) {
      checkArrayTypes(msg, nonce, key);
      checkLengths(key, nonce);
      var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
      var c = new Uint8Array(m.length);
      for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
      crypto_secretbox(c, m, m.length, nonce, key);
      return c.subarray(crypto_secretbox_BOXZEROBYTES);
    };

    nacl.secretbox.open = function(box, nonce, key) {
      checkArrayTypes(box, nonce, key);
      checkLengths(key, nonce);
      var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
      var m = new Uint8Array(c.length);
      for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
      if (c.length < 32) return null;
      if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
      return m.subarray(crypto_secretbox_ZEROBYTES);
    };

    nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
    nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
    nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

    nacl.scalarMult = function(n, p) {
      checkArrayTypes(n, p);
      if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
      if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
      var q = new Uint8Array(crypto_scalarmult_BYTES);
      crypto_scalarmult(q, n, p);
      return q;
    };

    nacl.scalarMult.base = function(n) {
      checkArrayTypes(n);
      if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
      var q = new Uint8Array(crypto_scalarmult_BYTES);
      crypto_scalarmult_base(q, n);
      return q;
    };

    nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
    nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

    nacl.box = function(msg, nonce, publicKey, secretKey) {
      var k = nacl.box.before(publicKey, secretKey);
      return nacl.secretbox(msg, nonce, k);
    };

    nacl.box.before = function(publicKey, secretKey) {
      checkArrayTypes(publicKey, secretKey);
      checkBoxLengths(publicKey, secretKey);
      var k = new Uint8Array(crypto_box_BEFORENMBYTES);
      crypto_box_beforenm(k, publicKey, secretKey);
      return k;
    };

    nacl.box.after = nacl.secretbox;

    nacl.box.open = function(msg, nonce, publicKey, secretKey) {
      var k = nacl.box.before(publicKey, secretKey);
      return nacl.secretbox.open(msg, nonce, k);
    };

    nacl.box.open.after = nacl.secretbox.open;

    nacl.box.keyPair = function() {
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
      crypto_box_keypair(pk, sk);
      return {publicKey: pk, secretKey: sk};
    };

    nacl.box.keyPair.fromSecretKey = function(secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_box_SECRETKEYBYTES)
        throw new Error('bad secret key size');
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      crypto_scalarmult_base(pk, secretKey);
      return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
    };

    nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
    nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
    nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
    nacl.box.nonceLength = crypto_box_NONCEBYTES;
    nacl.box.overheadLength = nacl.secretbox.overheadLength;

    nacl.sign = function(msg, secretKey) {
      checkArrayTypes(msg, secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error('bad secret key size');
      var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
      crypto_sign(signedMsg, msg, msg.length, secretKey);
      return signedMsg;
    };

    nacl.sign.open = function(signedMsg, publicKey) {
      checkArrayTypes(signedMsg, publicKey);
      if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
        throw new Error('bad public key size');
      var tmp = new Uint8Array(signedMsg.length);
      var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
      if (mlen < 0) return null;
      var m = new Uint8Array(mlen);
      for (var i = 0; i < m.length; i++) m[i] = tmp[i];
      return m;
    };

    nacl.sign.detached = function(msg, secretKey) {
      var signedMsg = nacl.sign(msg, secretKey);
      var sig = new Uint8Array(crypto_sign_BYTES);
      for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
      return sig;
    };

    nacl.sign.detached.verify = function(msg, sig, publicKey) {
      checkArrayTypes(msg, sig, publicKey);
      if (sig.length !== crypto_sign_BYTES)
        throw new Error('bad signature size');
      if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
        throw new Error('bad public key size');
      var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
      var m = new Uint8Array(crypto_sign_BYTES + msg.length);
      var i;
      for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
      for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
      return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
    };

    nacl.sign.keyPair = function() {
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
      crypto_sign_keypair(pk, sk);
      return {publicKey: pk, secretKey: sk};
    };

    nacl.sign.keyPair.fromSecretKey = function(secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error('bad secret key size');
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
      return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
    };

    nacl.sign.keyPair.fromSeed = function(seed) {
      checkArrayTypes(seed);
      if (seed.length !== crypto_sign_SEEDBYTES)
        throw new Error('bad seed size');
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
      for (var i = 0; i < 32; i++) sk[i] = seed[i];
      crypto_sign_keypair(pk, sk, true);
      return {publicKey: pk, secretKey: sk};
    };

    nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
    nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
    nacl.sign.seedLength = crypto_sign_SEEDBYTES;
    nacl.sign.signatureLength = crypto_sign_BYTES;

    nacl.hash = function(msg) {
      checkArrayTypes(msg);
      var h = new Uint8Array(crypto_hash_BYTES);
      crypto_hash(h, msg, msg.length);
      return h;
    };

    nacl.hash.hashLength = crypto_hash_BYTES;

    nacl.verify = function(x, y) {
      checkArrayTypes(x, y);
      // Zero length arguments are considered not equal.
      if (x.length === 0 || y.length === 0) return false;
      if (x.length !== y.length) return false;
      return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
    };

    nacl.setPRNG = function(fn) {
      randombytes = fn;
    };

    (function() {
      // Initialize PRNG if environment provides CSPRNG.
      // If not, methods calling randombytes will throw.
      var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
      if (crypto && crypto.getRandomValues) {
        // Browsers.
        var QUOTA = 65536;
        nacl.setPRNG(function(x, n) {
          var i, v = new Uint8Array(n);
          for (i = 0; i < n; i += QUOTA) {
            crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
          }
          for (i = 0; i < n; i++) x[i] = v[i];
          cleanup(v);
        });
      } else if (typeof commonjsRequire !== 'undefined') {
        // Node.js.
        crypto = require$$0;
        if (crypto && crypto.randomBytes) {
          nacl.setPRNG(function(x, n) {
            var i, v = crypto.randomBytes(n);
            for (i = 0; i < n; i++) x[i] = v[i];
            cleanup(v);
          });
        }
      }
    })();

    })( module.exports ? module.exports : (self.nacl = self.nacl || {}));
    });

    var browser = createCommonjsModule(function (module, exports) {

    // ref: https://github.com/tc39/proposal-global
    var getGlobal = function () {
    	// the only reliable means to get the global object is
    	// `Function('return this')()`
    	// However, this causes CSP violations in Chrome apps.
    	if (typeof self !== 'undefined') { return self; }
    	if (typeof window !== 'undefined') { return window; }
    	if (typeof global !== 'undefined') { return global; }
    	throw new Error('unable to locate global object');
    };

    var global = getGlobal();

    module.exports = exports = global.fetch;

    // Needed for TypeScript and Webpack.
    if (global.fetch) {
    	exports.default = global.fetch.bind(global);
    }

    exports.Headers = global.Headers;
    exports.Request = global.Request;
    exports.Response = global.Response;
    });

    var lamden = createCommonjsModule(function (module) {

    var global$1 = (typeof commonjsGlobal !== "undefined" ? commonjsGlobal :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) str += ' ... ';
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffffffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) return str.trim()
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    function getCjsExportFromNamespace (n) {
    	return n && n['default'] || n;
    }

    var dist = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
         factory(exports) ;
    }(commonjsGlobal$1, (function (exports) {
        class ValidateTypes {
          constructor() {}

          getType(value) {
            return Object.prototype.toString.call(value);
          }

          getClassName(value) {
            try {
              return value.constructor.name;
            } catch (e) {}

            return this.getType(value);
          } //Validation functions


          isObject(value) {
            if (this.getType(value) === "[object Object]") return true;
            return false;
          }

          isFunction(value) {
            if (this.getType(value) === "[object Function]") return true;
            return false;
          }

          isString(value) {
            if (this.getType(value) === "[object String]") return true;
            return false;
          }

          isBoolean(value) {
            if (this.getType(value) === "[object Boolean]") return true;
            return false;
          }

          isArray(value) {
            if (this.getType(value) === "[object Array]") return true;
            return false;
          }

          isNumber(value) {
            if (this.getType(value) === "[object Number]") return true;
            return false;
          }

          isInteger(value) {
            if (this.getType(value) === "[object Number]" && Number.isInteger(value)) return true;
            return false;
          }

          isRegEx(value) {
            if (this.getType(value) === "[object RegExp]") return true;
            return false;
          }

          isStringHex(value) {
            if (!this.isStringWithValue(value)) return false;
            let hexRegEx = /([0-9]|[a-f])/gim;
            return (value.match(hexRegEx) || []).length === value.length;
          }

          hasKeys(value, keys) {
            if (keys.map(key => key in value).includes(false)) return false;
            return true;
          }

          isStringWithValue(value) {
            if (this.isString(value) && value !== '') return true;
            return false;
          }

          isObjectWithKeys(value) {
            if (this.isObject(value) && Object.keys(value).length > 0) return true;
            return false;
          }

          isArrayWithValues(value) {
            if (this.isArray(value) && value.length > 0) return true;
            return false;
          }

          isSpecificClass(value, className) {
            if (!this.isObject(value)) return false;
            if (this.getClassName(value) !== className) return false;
            return true;
          }

        }

        class AssertTypes {
          constructor() {
            this.validate = new ValidateTypes();
          } //Validation functions


          isObject(value) {
            if (!this.validate.isObject(value)) {
              throw new TypeError(`Expected type [object Object] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isFunction(value) {
            if (!this.validate.isFunction(value)) {
              throw new TypeError(`Expected type [object Function] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isString(value) {
            if (!this.validate.isString(value)) {
              throw new TypeError(`Expected type [object String] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isBoolean(value) {
            if (!this.validate.isBoolean(value)) {
              throw new TypeError(`Expected type [object Boolean] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isArray(value) {
            if (!this.validate.isArray(value)) {
              throw new TypeError(`Expected type [object Array] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isNumber(value) {
            if (!this.validate.isNumber(value)) {
              throw new TypeError(`Expected type [object Number] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isInteger(value) {
            if (!this.validate.isInteger(value)) {
              throw new TypeError(`Expected "${value}" to be an integer but got non-integer value`);
            }

            return true;
          }

          isRegEx(value) {
            if (!this.validate.isRegEx(value)) {
              throw new TypeError(`Expected type [object RegExp] but got ${this.validate.getType(value)}`);
            }

            return true;
          }

          isStringHex(value) {
            if (!this.validate.isStringHex(value)) {
              throw new TypeError(`Expected "${value}" to be hex but got non-hex value`);
            }

            return true;
          }

          hasKeys(value, keys) {
            if (!this.validate.hasKeys(value, keys)) {
              throw new TypeError(`Provided object does not contain all keys ${JSON.stringify(keys)}`);
            }

            return true;
          }

          isStringWithValue(value) {
            if (!this.validate.isStringWithValue(value)) {
              throw new TypeError(`Expected "${value}" to be [object String] and not empty`);
            }

            return true;
          }

          isObjectWithKeys(value) {
            if (!this.validate.isObjectWithKeys(value)) {
              throw new TypeError(`Expected "${value}" to be [object Object] and have keys`);
            }

            return true;
          }

          isArrayWithValues(value) {
            if (!this.validate.isArrayWithValues(value)) {
              throw new TypeError(`Expected "${value}" to be [object Array] and not empty`);
            }

            return true;
          }

          isSpecificClass(value, className) {
            if (!this.validate.isSpecificClass(value, className)) {
              throw new TypeError(`Expected Object Class to be "${className}" but got ${this.validate.getClassName(value)}`);
            }

            return true;
          }

        }

        const validateTypes = new ValidateTypes();
        const assertTypes = new AssertTypes();

        exports.assertTypes = assertTypes;
        exports.validateTypes = validateTypes;

        Object.defineProperty(exports, '__esModule', { value: true });

    })));
    });

    var validators = unwrapExports(dist);

    function buf2hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }
    function hex2buf(hexString) {
        var bytes = new Uint8Array(Math.ceil(hexString.length / 2));
        for (var i = 0; i < bytes.length; i++)
            bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
        return bytes;
    }
    function concatUint8Arrays(array1, array2) {
        var arr = new Uint8Array(array1.length + array2.length);
        arr.set(array1);
        arr.set(array2, array1.length);
        return arr;
    }



    /**
     * @param Uint8Array(length: 32) seed
     *      seed:   A Uint8Array with a length of 32 to seed the keyPair with. This is advanced behavior and should be
     *              avoided by everyday users
     *
     * @return {Uint8Array(length: 32), Uint8Array(length: 32)} { vk, sk }
     *      sk:     Signing Key (SK) represents 32 byte signing key
     *      vk:     Verify Key (VK) represents a 32 byte verify key
     */
    function generate_keys(seed = null) {
        var kp = null;
        if (seed == null) {
            kp = naclFast.sign.keyPair();
        }
        else {
            kp = naclFast.sign.keyPair.fromSeed(seed);
        }
        // In the JS implementation of the NaCL library the sk is the first 32 bytes of the secretKey
        // and the vk is the last 32 bytes of the secretKey as well as the publicKey
        // {
        //   'publicKey': <vk>,
        //   'secretKey': <sk><vk>
        // }
        return {
            sk: new Uint8Array(kp['secretKey'].slice(0, 32)),
            vk: new Uint8Array(kp['secretKey'].slice(32, 64))
        };
    }
    /**
     * @param String sk
     *      sk:     A 64 character long hex representation of a signing key (private key)
     *
     * @return String vk
     *      vk:     A 64 character long hex representation of a verify key (public key)
     */
    function get_vk(sk) {
        var kp = format_to_keys(sk);
        var kpf = keys_to_format(kp);
        return kpf.vk;
    }
    /**
     * @param String sk
     *      sk:     A 64 character long hex representation of a signing key (private key)
     *
     * @return {Uint8Array(length: 32), Uint8Array(length: 32)} { vk, sk }
     *      sk:     Signing Key (SK) represents 32 byte signing key
     *      vk:     Verify Key (VK) represents a 32 byte verify key
     */
    function format_to_keys(sk) {
        var skf = hex2buf(sk);
        var kp = generate_keys(skf);
        return kp;
    }
    /**
     * @param Object kp
     *      kp:     Object containing the properties sk and vk
     *          sk:     Signing Key (SK) represents 32 byte signing key
     *          vk:     Verify Key (VK) represents a 32 byte verify key
     *
     * @return {string, string} { sk, vk }
     *      sk:     Signing Key (SK) represented as a 64 character hex string
     *      vk:     Verify Key (VK) represented as a 64 character hex string
     */
    function keys_to_format(kp) {
        return {
            vk: buf2hex(kp.vk),
            sk: buf2hex(kp.sk)
        };
    }
    /**
     * @param Uint8Array(length: 32) seed
     *      seed:   A Uint8Array with a length of 32 to seed the keyPair with. This is advanced behavior and should be
     *              avoided by everyday users
     *
     * @return {string, string} { sk, vk }
     *      sk:     Signing Key (SK) represented as a 64 character hex string
     *      vk:     Verify Key (VK) represented as a 64 character hex string
     */
    function new_wallet(seed = null) {
        const keys = generate_keys(seed);
        return keys_to_format(keys);
    }
    /**
     * @param String sk
     * @param Uint8Array msg
     *      sk:     A 64 character long hex representation of a signing key (private key)
     *      msg:    A Uint8Array of bytes representing the message you would like to sign
     *
     * @return String sig
     *      sig:    A 128 character long hex string representing the message's signature
     */
    function sign(sk, msg) {
        var kp = format_to_keys(sk);
        // This is required due to the secretKey required to sign a transaction
        // in the js implementation of NaCL being the combination of the sk and
        // vk for some stupid reason. That being said, we still want the sk and
        // vk objects to exist in 32-byte string format (same as cilantro's
        // python implementation) when presented to the user.
        var jsnacl_sk = concatUint8Arrays(kp.sk, kp.vk);
        return buf2hex(naclFast.sign.detached(msg, jsnacl_sk));
    }
    /**
     * @param String vk
     * @param Uint8Array msg
     * @param String sig
     *      vk:     A 64 character long hex representation of a verify key (public key)
     *      msg:    A Uint8Array (bytes) representation of a message that has been signed
     *      sig:    A 128 character long hex representation of a nacl signature
     *
     * @return Bool result
     *      result: true if verify checked out, false if not
     */
    function verify(vk, msg, sig) {
        var vkb = hex2buf(vk);
        var sigb = hex2buf(sig);
        try {
            return naclFast.sign.detached.verify(msg, sigb, vkb);
        }
        catch (_a) {
            return false;
        }
    }

    var wallet = /*#__PURE__*/Object.freeze({
                __proto__: null,
                generate_keys: generate_keys,
                get_vk: get_vk,
                format_to_keys: format_to_keys,
                keys_to_format: keys_to_format,
                new_wallet: new_wallet,
                sign: sign,
                verify: verify
    });

    class EventEmitter {
        constructor() {
          this._events = {};
        }
      
        on(name, listener) {
            if (!this._events[name]) {
                this._events[name] = [];
            }

            this._events[name].push(listener);
        }
      
        removeListener(name, listenerToRemove) {
            if (!this._events[name]) {
                throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
            }

            const filterListeners = (listener) => listener !== listenerToRemove;
            this._events[name] = this._events[name].filter(filterListeners);
        }
      
        emit(name, data) {
            if (!this._events[name]) return
      
                const fireCallbacks = (callback) => {
                    callback(data);
                };
            
                this._events[name].forEach(fireCallbacks);
            }
        }

    /*
     *      bignumber.js v9.0.1
     *      A JavaScript library for arbitrary-precision arithmetic.
     *      https://github.com/MikeMcl/bignumber.js
     *      Copyright (c) 2020 Michael Mclaughlin <M8ch88l@gmail.com>
     *      MIT Licensed.
     *
     *      BigNumber.prototype methods     |  BigNumber methods
     *                                      |
     *      absoluteValue            abs    |  clone
     *      comparedTo                      |  config               set
     *      decimalPlaces            dp     |      DECIMAL_PLACES
     *      dividedBy                div    |      ROUNDING_MODE
     *      dividedToIntegerBy       idiv   |      EXPONENTIAL_AT
     *      exponentiatedBy          pow    |      RANGE
     *      integerValue                    |      CRYPTO
     *      isEqualTo                eq     |      MODULO_MODE
     *      isFinite                        |      POW_PRECISION
     *      isGreaterThan            gt     |      FORMAT
     *      isGreaterThanOrEqualTo   gte    |      ALPHABET
     *      isInteger                       |  isBigNumber
     *      isLessThan               lt     |  maximum              max
     *      isLessThanOrEqualTo      lte    |  minimum              min
     *      isNaN                           |  random
     *      isNegative                      |  sum
     *      isPositive                      |
     *      isZero                          |
     *      minus                           |
     *      modulo                   mod    |
     *      multipliedBy             times  |
     *      negated                         |
     *      plus                            |
     *      precision                sd     |
     *      shiftedBy                       |
     *      squareRoot               sqrt   |
     *      toExponential                   |
     *      toFixed                         |
     *      toFormat                        |
     *      toFraction                      |
     *      toJSON                          |
     *      toNumber                        |
     *      toPrecision                     |
     *      toString                        |
     *      valueOf                         |
     *
     */


    var
      isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,

      mathceil = Math.ceil,
      mathfloor = Math.floor,

      bignumberError = '[BigNumber Error] ',
      tooManyDigits = bignumberError + 'Number primitive has more than 15 significant digits: ',

      BASE = 1e14,
      LOG_BASE = 14,
      MAX_SAFE_INTEGER = 0x1fffffffffffff,         // 2^53 - 1
      // MAX_INT32 = 0x7fffffff,                   // 2^31 - 1
      POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13],
      SQRT_BASE = 1e7,

      // EDITABLE
      // The limit on the value of DECIMAL_PLACES, TO_EXP_NEG, TO_EXP_POS, MIN_EXP, MAX_EXP, and
      // the arguments to toExponential, toFixed, toFormat, and toPrecision.
      MAX = 1E9;                                   // 0 to MAX_INT32


    /*
     * Create and return a BigNumber constructor.
     */
    function clone(configObject) {
      var div, convertBase, parseNumeric,
        P = BigNumber.prototype = { constructor: BigNumber, toString: null, valueOf: null },
        ONE = new BigNumber(1),


        //----------------------------- EDITABLE CONFIG DEFAULTS -------------------------------


        // The default values below must be integers within the inclusive ranges stated.
        // The values can also be changed at run-time using BigNumber.set.

        // The maximum number of decimal places for operations involving division.
        DECIMAL_PLACES = 20,                     // 0 to MAX

        // The rounding mode used when rounding to the above decimal places, and when using
        // toExponential, toFixed, toFormat and toPrecision, and round (default value).
        // UP         0 Away from zero.
        // DOWN       1 Towards zero.
        // CEIL       2 Towards +Infinity.
        // FLOOR      3 Towards -Infinity.
        // HALF_UP    4 Towards nearest neighbour. If equidistant, up.
        // HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
        // HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
        // HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
        // HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
        ROUNDING_MODE = 4,                       // 0 to 8

        // EXPONENTIAL_AT : [TO_EXP_NEG , TO_EXP_POS]

        // The exponent value at and beneath which toString returns exponential notation.
        // Number type: -7
        TO_EXP_NEG = -7,                         // 0 to -MAX

        // The exponent value at and above which toString returns exponential notation.
        // Number type: 21
        TO_EXP_POS = 21,                         // 0 to MAX

        // RANGE : [MIN_EXP, MAX_EXP]

        // The minimum exponent value, beneath which underflow to zero occurs.
        // Number type: -324  (5e-324)
        MIN_EXP = -1e7,                          // -1 to -MAX

        // The maximum exponent value, above which overflow to Infinity occurs.
        // Number type:  308  (1.7976931348623157e+308)
        // For MAX_EXP > 1e7, e.g. new BigNumber('1e100000000').plus(1) may be slow.
        MAX_EXP = 1e7,                           // 1 to MAX

        // Whether to use cryptographically-secure random number generation, if available.
        CRYPTO = false,                          // true or false

        // The modulo mode used when calculating the modulus: a mod n.
        // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
        // The remainder (r) is calculated as: r = a - n * q.
        //
        // UP        0 The remainder is positive if the dividend is negative, else is negative.
        // DOWN      1 The remainder has the same sign as the dividend.
        //             This modulo mode is commonly known as 'truncated division' and is
        //             equivalent to (a % n) in JavaScript.
        // FLOOR     3 The remainder has the same sign as the divisor (Python %).
        // HALF_EVEN 6 This modulo mode implements the IEEE 754 remainder function.
        // EUCLID    9 Euclidian division. q = sign(n) * floor(a / abs(n)).
        //             The remainder is always positive.
        //
        // The truncated division, floored division, Euclidian division and IEEE 754 remainder
        // modes are commonly used for the modulus operation.
        // Although the other rounding modes can also be used, they may not give useful results.
        MODULO_MODE = 1,                         // 0 to 9

        // The maximum number of significant digits of the result of the exponentiatedBy operation.
        // If POW_PRECISION is 0, there will be unlimited significant digits.
        POW_PRECISION = 0,                    // 0 to MAX

        // The format specification used by the BigNumber.prototype.toFormat method.
        FORMAT = {
          prefix: '',
          groupSize: 3,
          secondaryGroupSize: 0,
          groupSeparator: ',',
          decimalSeparator: '.',
          fractionGroupSize: 0,
          fractionGroupSeparator: '\xA0',      // non-breaking space
          suffix: ''
        },

        // The alphabet used for base conversion. It must be at least 2 characters long, with no '+',
        // '-', '.', whitespace, or repeated character.
        // '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'
        ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';


      //------------------------------------------------------------------------------------------


      // CONSTRUCTOR


      /*
       * The BigNumber constructor and exported function.
       * Create and return a new instance of a BigNumber object.
       *
       * v {number|string|BigNumber} A numeric value.
       * [b] {number} The base of v. Integer, 2 to ALPHABET.length inclusive.
       */
      function BigNumber(v, b) {
        var alphabet, c, caseChanged, e, i, isNum, len, str,
          x = this;

        // Enable constructor call without `new`.
        if (!(x instanceof BigNumber)) return new BigNumber(v, b);

        if (b == null) {

          if (v && v._isBigNumber === true) {
            x.s = v.s;

            if (!v.c || v.e > MAX_EXP) {
              x.c = x.e = null;
            } else if (v.e < MIN_EXP) {
              x.c = [x.e = 0];
            } else {
              x.e = v.e;
              x.c = v.c.slice();
            }

            return;
          }

          if ((isNum = typeof v == 'number') && v * 0 == 0) {

            // Use `1 / n` to handle minus zero also.
            x.s = 1 / v < 0 ? (v = -v, -1) : 1;

            // Fast path for integers, where n < 2147483648 (2**31).
            if (v === ~~v) {
              for (e = 0, i = v; i >= 10; i /= 10, e++);

              if (e > MAX_EXP) {
                x.c = x.e = null;
              } else {
                x.e = e;
                x.c = [v];
              }

              return;
            }

            str = String(v);
          } else {

            if (!isNumeric.test(str = String(v))) return parseNumeric(x, str, isNum);

            x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
          }

          // Decimal point?
          if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

          // Exponential form?
          if ((i = str.search(/e/i)) > 0) {

            // Determine exponent.
            if (e < 0) e = i;
            e += +str.slice(i + 1);
            str = str.substring(0, i);
          } else if (e < 0) {

            // Integer.
            e = str.length;
          }

        } else {

          // '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
          intCheck(b, 2, ALPHABET.length, 'Base');

          // Allow exponential notation to be used with base 10 argument, while
          // also rounding to DECIMAL_PLACES as with other bases.
          if (b == 10) {
            x = new BigNumber(v);
            return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
          }

          str = String(v);

          if (isNum = typeof v == 'number') {

            // Avoid potential interpretation of Infinity and NaN as base 44+ values.
            if (v * 0 != 0) return parseNumeric(x, str, isNum, b);

            x.s = 1 / v < 0 ? (str = str.slice(1), -1) : 1;

            // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
            if (BigNumber.DEBUG && str.replace(/^0\.0*|\./, '').length > 15) {
              throw Error
               (tooManyDigits + v);
            }
          } else {
            x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
          }

          alphabet = ALPHABET.slice(0, b);
          e = i = 0;

          // Check that str is a valid base b number.
          // Don't use RegExp, so alphabet can contain special characters.
          for (len = str.length; i < len; i++) {
            if (alphabet.indexOf(c = str.charAt(i)) < 0) {
              if (c == '.') {

                // If '.' is not the first character and it has not be found before.
                if (i > e) {
                  e = len;
                  continue;
                }
              } else if (!caseChanged) {

                // Allow e.g. hexadecimal 'FF' as well as 'ff'.
                if (str == str.toUpperCase() && (str = str.toLowerCase()) ||
                    str == str.toLowerCase() && (str = str.toUpperCase())) {
                  caseChanged = true;
                  i = -1;
                  e = 0;
                  continue;
                }
              }

              return parseNumeric(x, String(v), isNum, b);
            }
          }

          // Prevent later check for length on converted number.
          isNum = false;
          str = convertBase(str, b, 10, x.s);

          // Decimal point?
          if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
          else e = str.length;
        }

        // Determine leading zeros.
        for (i = 0; str.charCodeAt(i) === 48; i++);

        // Determine trailing zeros.
        for (len = str.length; str.charCodeAt(--len) === 48;);

        if (str = str.slice(i, ++len)) {
          len -= i;

          // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
          if (isNum && BigNumber.DEBUG &&
            len > 15 && (v > MAX_SAFE_INTEGER || v !== mathfloor(v))) {
              throw Error
               (tooManyDigits + (x.s * v));
          }

           // Overflow?
          if ((e = e - i - 1) > MAX_EXP) {

            // Infinity.
            x.c = x.e = null;

          // Underflow?
          } else if (e < MIN_EXP) {

            // Zero.
            x.c = [x.e = 0];
          } else {
            x.e = e;
            x.c = [];

            // Transform base

            // e is the base 10 exponent.
            // i is where to slice str to get the first element of the coefficient array.
            i = (e + 1) % LOG_BASE;
            if (e < 0) i += LOG_BASE;  // i < 1

            if (i < len) {
              if (i) x.c.push(+str.slice(0, i));

              for (len -= LOG_BASE; i < len;) {
                x.c.push(+str.slice(i, i += LOG_BASE));
              }

              i = LOG_BASE - (str = str.slice(i)).length;
            } else {
              i -= len;
            }

            for (; i--; str += '0');
            x.c.push(+str);
          }
        } else {

          // Zero.
          x.c = [x.e = 0];
        }
      }


      // CONSTRUCTOR PROPERTIES


      BigNumber.clone = clone;

      BigNumber.ROUND_UP = 0;
      BigNumber.ROUND_DOWN = 1;
      BigNumber.ROUND_CEIL = 2;
      BigNumber.ROUND_FLOOR = 3;
      BigNumber.ROUND_HALF_UP = 4;
      BigNumber.ROUND_HALF_DOWN = 5;
      BigNumber.ROUND_HALF_EVEN = 6;
      BigNumber.ROUND_HALF_CEIL = 7;
      BigNumber.ROUND_HALF_FLOOR = 8;
      BigNumber.EUCLID = 9;


      /*
       * Configure infrequently-changing library-wide settings.
       *
       * Accept an object with the following optional properties (if the value of a property is
       * a number, it must be an integer within the inclusive range stated):
       *
       *   DECIMAL_PLACES   {number}           0 to MAX
       *   ROUNDING_MODE    {number}           0 to 8
       *   EXPONENTIAL_AT   {number|number[]}  -MAX to MAX  or  [-MAX to 0, 0 to MAX]
       *   RANGE            {number|number[]}  -MAX to MAX (not zero)  or  [-MAX to -1, 1 to MAX]
       *   CRYPTO           {boolean}          true or false
       *   MODULO_MODE      {number}           0 to 9
       *   POW_PRECISION       {number}           0 to MAX
       *   ALPHABET         {string}           A string of two or more unique characters which does
       *                                     not contain '.'.
       *   FORMAT           {object}           An object with some of the following properties:
       *     prefix                 {string}
       *     groupSize              {number}
       *     secondaryGroupSize     {number}
       *     groupSeparator         {string}
       *     decimalSeparator       {string}
       *     fractionGroupSize      {number}
       *     fractionGroupSeparator {string}
       *     suffix                 {string}
       *
       * (The values assigned to the above FORMAT object properties are not checked for validity.)
       *
       * E.g.
       * BigNumber.config({ DECIMAL_PLACES : 20, ROUNDING_MODE : 4 })
       *
       * Ignore properties/parameters set to null or undefined, except for ALPHABET.
       *
       * Return an object with the properties current values.
       */
      BigNumber.config = BigNumber.set = function (obj) {
        var p, v;

        if (obj != null) {

          if (typeof obj == 'object') {

            // DECIMAL_PLACES {number} Integer, 0 to MAX inclusive.
            // '[BigNumber Error] DECIMAL_PLACES {not a primitive number|not an integer|out of range}: {v}'
            if (obj.hasOwnProperty(p = 'DECIMAL_PLACES')) {
              v = obj[p];
              intCheck(v, 0, MAX, p);
              DECIMAL_PLACES = v;
            }

            // ROUNDING_MODE {number} Integer, 0 to 8 inclusive.
            // '[BigNumber Error] ROUNDING_MODE {not a primitive number|not an integer|out of range}: {v}'
            if (obj.hasOwnProperty(p = 'ROUNDING_MODE')) {
              v = obj[p];
              intCheck(v, 0, 8, p);
              ROUNDING_MODE = v;
            }

            // EXPONENTIAL_AT {number|number[]}
            // Integer, -MAX to MAX inclusive or
            // [integer -MAX to 0 inclusive, 0 to MAX inclusive].
            // '[BigNumber Error] EXPONENTIAL_AT {not a primitive number|not an integer|out of range}: {v}'
            if (obj.hasOwnProperty(p = 'EXPONENTIAL_AT')) {
              v = obj[p];
              if (v && v.pop) {
                intCheck(v[0], -MAX, 0, p);
                intCheck(v[1], 0, MAX, p);
                TO_EXP_NEG = v[0];
                TO_EXP_POS = v[1];
              } else {
                intCheck(v, -MAX, MAX, p);
                TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
              }
            }

            // RANGE {number|number[]} Non-zero integer, -MAX to MAX inclusive or
            // [integer -MAX to -1 inclusive, integer 1 to MAX inclusive].
            // '[BigNumber Error] RANGE {not a primitive number|not an integer|out of range|cannot be zero}: {v}'
            if (obj.hasOwnProperty(p = 'RANGE')) {
              v = obj[p];
              if (v && v.pop) {
                intCheck(v[0], -MAX, -1, p);
                intCheck(v[1], 1, MAX, p);
                MIN_EXP = v[0];
                MAX_EXP = v[1];
              } else {
                intCheck(v, -MAX, MAX, p);
                if (v) {
                  MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
                } else {
                  throw Error
                   (bignumberError + p + ' cannot be zero: ' + v);
                }
              }
            }

            // CRYPTO {boolean} true or false.
            // '[BigNumber Error] CRYPTO not true or false: {v}'
            // '[BigNumber Error] crypto unavailable'
            if (obj.hasOwnProperty(p = 'CRYPTO')) {
              v = obj[p];
              if (v === !!v) {
                if (v) {
                  if (typeof crypto != 'undefined' && crypto &&
                   (crypto.getRandomValues || crypto.randomBytes)) {
                    CRYPTO = v;
                  } else {
                    CRYPTO = !v;
                    throw Error
                     (bignumberError + 'crypto unavailable');
                  }
                } else {
                  CRYPTO = v;
                }
              } else {
                throw Error
                 (bignumberError + p + ' not true or false: ' + v);
              }
            }

            // MODULO_MODE {number} Integer, 0 to 9 inclusive.
            // '[BigNumber Error] MODULO_MODE {not a primitive number|not an integer|out of range}: {v}'
            if (obj.hasOwnProperty(p = 'MODULO_MODE')) {
              v = obj[p];
              intCheck(v, 0, 9, p);
              MODULO_MODE = v;
            }

            // POW_PRECISION {number} Integer, 0 to MAX inclusive.
            // '[BigNumber Error] POW_PRECISION {not a primitive number|not an integer|out of range}: {v}'
            if (obj.hasOwnProperty(p = 'POW_PRECISION')) {
              v = obj[p];
              intCheck(v, 0, MAX, p);
              POW_PRECISION = v;
            }

            // FORMAT {object}
            // '[BigNumber Error] FORMAT not an object: {v}'
            if (obj.hasOwnProperty(p = 'FORMAT')) {
              v = obj[p];
              if (typeof v == 'object') FORMAT = v;
              else throw Error
               (bignumberError + p + ' not an object: ' + v);
            }

            // ALPHABET {string}
            // '[BigNumber Error] ALPHABET invalid: {v}'
            if (obj.hasOwnProperty(p = 'ALPHABET')) {
              v = obj[p];

              // Disallow if only one character,
              // or if it contains '+', '-', '.', whitespace, or a repeated character.
              if (typeof v == 'string' && !/^.$|[+-.\s]|(.).*\1/.test(v)) {
                ALPHABET = v;
              } else {
                throw Error
                 (bignumberError + p + ' invalid: ' + v);
              }
            }

          } else {

            // '[BigNumber Error] Object expected: {v}'
            throw Error
             (bignumberError + 'Object expected: ' + obj);
          }
        }

        return {
          DECIMAL_PLACES: DECIMAL_PLACES,
          ROUNDING_MODE: ROUNDING_MODE,
          EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
          RANGE: [MIN_EXP, MAX_EXP],
          CRYPTO: CRYPTO,
          MODULO_MODE: MODULO_MODE,
          POW_PRECISION: POW_PRECISION,
          FORMAT: FORMAT,
          ALPHABET: ALPHABET
        };
      };


      /*
       * Return true if v is a BigNumber instance, otherwise return false.
       *
       * If BigNumber.DEBUG is true, throw if a BigNumber instance is not well-formed.
       *
       * v {any}
       *
       * '[BigNumber Error] Invalid BigNumber: {v}'
       */
      BigNumber.isBigNumber = function (v) {
        if (!v || v._isBigNumber !== true) return false;
        if (!BigNumber.DEBUG) return true;

        var i, n,
          c = v.c,
          e = v.e,
          s = v.s;

        out: if ({}.toString.call(c) == '[object Array]') {

          if ((s === 1 || s === -1) && e >= -MAX && e <= MAX && e === mathfloor(e)) {

            // If the first element is zero, the BigNumber value must be zero.
            if (c[0] === 0) {
              if (e === 0 && c.length === 1) return true;
              break out;
            }

            // Calculate number of digits that c[0] should have, based on the exponent.
            i = (e + 1) % LOG_BASE;
            if (i < 1) i += LOG_BASE;

            // Calculate number of digits of c[0].
            //if (Math.ceil(Math.log(c[0] + 1) / Math.LN10) == i) {
            if (String(c[0]).length == i) {

              for (i = 0; i < c.length; i++) {
                n = c[i];
                if (n < 0 || n >= BASE || n !== mathfloor(n)) break out;
              }

              // Last element cannot be zero, unless it is the only element.
              if (n !== 0) return true;
            }
          }

        // Infinity/NaN
        } else if (c === null && e === null && (s === null || s === 1 || s === -1)) {
          return true;
        }

        throw Error
          (bignumberError + 'Invalid BigNumber: ' + v);
      };


      /*
       * Return a new BigNumber whose value is the maximum of the arguments.
       *
       * arguments {number|string|BigNumber}
       */
      BigNumber.maximum = BigNumber.max = function () {
        return maxOrMin(arguments, P.lt);
      };


      /*
       * Return a new BigNumber whose value is the minimum of the arguments.
       *
       * arguments {number|string|BigNumber}
       */
      BigNumber.minimum = BigNumber.min = function () {
        return maxOrMin(arguments, P.gt);
      };


      /*
       * Return a new BigNumber with a random value equal to or greater than 0 and less than 1,
       * and with dp, or DECIMAL_PLACES if dp is omitted, decimal places (or less if trailing
       * zeros are produced).
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp}'
       * '[BigNumber Error] crypto unavailable'
       */
      BigNumber.random = (function () {
        var pow2_53 = 0x20000000000000;

        // Return a 53 bit integer n, where 0 <= n < 9007199254740992.
        // Check if Math.random() produces more than 32 bits of randomness.
        // If it does, assume at least 53 bits are produced, otherwise assume at least 30 bits.
        // 0x40000000 is 2^30, 0x800000 is 2^23, 0x1fffff is 2^21 - 1.
        var random53bitInt = (Math.random() * pow2_53) & 0x1fffff
         ? function () { return mathfloor(Math.random() * pow2_53); }
         : function () { return ((Math.random() * 0x40000000 | 0) * 0x800000) +
           (Math.random() * 0x800000 | 0); };

        return function (dp) {
          var a, b, e, k, v,
            i = 0,
            c = [],
            rand = new BigNumber(ONE);

          if (dp == null) dp = DECIMAL_PLACES;
          else intCheck(dp, 0, MAX);

          k = mathceil(dp / LOG_BASE);

          if (CRYPTO) {

            // Browsers supporting crypto.getRandomValues.
            if (crypto.getRandomValues) {

              a = crypto.getRandomValues(new Uint32Array(k *= 2));

              for (; i < k;) {

                // 53 bits:
                // ((Math.pow(2, 32) - 1) * Math.pow(2, 21)).toString(2)
                // 11111 11111111 11111111 11111111 11100000 00000000 00000000
                // ((Math.pow(2, 32) - 1) >>> 11).toString(2)
                //                                     11111 11111111 11111111
                // 0x20000 is 2^21.
                v = a[i] * 0x20000 + (a[i + 1] >>> 11);

                // Rejection sampling:
                // 0 <= v < 9007199254740992
                // Probability that v >= 9e15, is
                // 7199254740992 / 9007199254740992 ~= 0.0008, i.e. 1 in 1251
                if (v >= 9e15) {
                  b = crypto.getRandomValues(new Uint32Array(2));
                  a[i] = b[0];
                  a[i + 1] = b[1];
                } else {

                  // 0 <= v <= 8999999999999999
                  // 0 <= (v % 1e14) <= 99999999999999
                  c.push(v % 1e14);
                  i += 2;
                }
              }
              i = k / 2;

            // Node.js supporting crypto.randomBytes.
            } else if (crypto.randomBytes) {

              // buffer
              a = crypto.randomBytes(k *= 7);

              for (; i < k;) {

                // 0x1000000000000 is 2^48, 0x10000000000 is 2^40
                // 0x100000000 is 2^32, 0x1000000 is 2^24
                // 11111 11111111 11111111 11111111 11111111 11111111 11111111
                // 0 <= v < 9007199254740992
                v = ((a[i] & 31) * 0x1000000000000) + (a[i + 1] * 0x10000000000) +
                   (a[i + 2] * 0x100000000) + (a[i + 3] * 0x1000000) +
                   (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];

                if (v >= 9e15) {
                  crypto.randomBytes(7).copy(a, i);
                } else {

                  // 0 <= (v % 1e14) <= 99999999999999
                  c.push(v % 1e14);
                  i += 7;
                }
              }
              i = k / 7;
            } else {
              CRYPTO = false;
              throw Error
               (bignumberError + 'crypto unavailable');
            }
          }

          // Use Math.random.
          if (!CRYPTO) {

            for (; i < k;) {
              v = random53bitInt();
              if (v < 9e15) c[i++] = v % 1e14;
            }
          }

          k = c[--i];
          dp %= LOG_BASE;

          // Convert trailing digits to zeros according to dp.
          if (k && dp) {
            v = POWS_TEN[LOG_BASE - dp];
            c[i] = mathfloor(k / v) * v;
          }

          // Remove trailing elements which are zero.
          for (; c[i] === 0; c.pop(), i--);

          // Zero?
          if (i < 0) {
            c = [e = 0];
          } else {

            // Remove leading elements which are zero and adjust exponent accordingly.
            for (e = -1 ; c[0] === 0; c.splice(0, 1), e -= LOG_BASE);

            // Count the digits of the first element of c to determine leading zeros, and...
            for (i = 1, v = c[0]; v >= 10; v /= 10, i++);

            // adjust the exponent accordingly.
            if (i < LOG_BASE) e -= LOG_BASE - i;
          }

          rand.e = e;
          rand.c = c;
          return rand;
        };
      })();


       /*
       * Return a BigNumber whose value is the sum of the arguments.
       *
       * arguments {number|string|BigNumber}
       */
      BigNumber.sum = function () {
        var i = 1,
          args = arguments,
          sum = new BigNumber(args[0]);
        for (; i < args.length;) sum = sum.plus(args[i++]);
        return sum;
      };


      // PRIVATE FUNCTIONS


      // Called by BigNumber and BigNumber.prototype.toString.
      convertBase = (function () {
        var decimal = '0123456789';

        /*
         * Convert string of baseIn to an array of numbers of baseOut.
         * Eg. toBaseOut('255', 10, 16) returns [15, 15].
         * Eg. toBaseOut('ff', 16, 10) returns [2, 5, 5].
         */
        function toBaseOut(str, baseIn, baseOut, alphabet) {
          var j,
            arr = [0],
            arrL,
            i = 0,
            len = str.length;

          for (; i < len;) {
            for (arrL = arr.length; arrL--; arr[arrL] *= baseIn);

            arr[0] += alphabet.indexOf(str.charAt(i++));

            for (j = 0; j < arr.length; j++) {

              if (arr[j] > baseOut - 1) {
                if (arr[j + 1] == null) arr[j + 1] = 0;
                arr[j + 1] += arr[j] / baseOut | 0;
                arr[j] %= baseOut;
              }
            }
          }

          return arr.reverse();
        }

        // Convert a numeric string of baseIn to a numeric string of baseOut.
        // If the caller is toString, we are converting from base 10 to baseOut.
        // If the caller is BigNumber, we are converting from baseIn to base 10.
        return function (str, baseIn, baseOut, sign, callerIsToString) {
          var alphabet, d, e, k, r, x, xc, y,
            i = str.indexOf('.'),
            dp = DECIMAL_PLACES,
            rm = ROUNDING_MODE;

          // Non-integer.
          if (i >= 0) {
            k = POW_PRECISION;

            // Unlimited precision.
            POW_PRECISION = 0;
            str = str.replace('.', '');
            y = new BigNumber(baseIn);
            x = y.pow(str.length - i);
            POW_PRECISION = k;

            // Convert str as if an integer, then restore the fraction part by dividing the
            // result by its base raised to a power.

            y.c = toBaseOut(toFixedPoint(coeffToString(x.c), x.e, '0'),
             10, baseOut, decimal);
            y.e = y.c.length;
          }

          // Convert the number as integer.

          xc = toBaseOut(str, baseIn, baseOut, callerIsToString
           ? (alphabet = ALPHABET, decimal)
           : (alphabet = decimal, ALPHABET));

          // xc now represents str as an integer and converted to baseOut. e is the exponent.
          e = k = xc.length;

          // Remove trailing zeros.
          for (; xc[--k] == 0; xc.pop());

          // Zero?
          if (!xc[0]) return alphabet.charAt(0);

          // Does str represent an integer? If so, no need for the division.
          if (i < 0) {
            --e;
          } else {
            x.c = xc;
            x.e = e;

            // The sign is needed for correct rounding.
            x.s = sign;
            x = div(x, y, dp, rm, baseOut);
            xc = x.c;
            r = x.r;
            e = x.e;
          }

          // xc now represents str converted to baseOut.

          // THe index of the rounding digit.
          d = e + dp + 1;

          // The rounding digit: the digit to the right of the digit that may be rounded up.
          i = xc[d];

          // Look at the rounding digits and mode to determine whether to round up.

          k = baseOut / 2;
          r = r || d < 0 || xc[d + 1] != null;

          r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
                : i > k || i == k &&(rm == 4 || r || rm == 6 && xc[d - 1] & 1 ||
                 rm == (x.s < 0 ? 8 : 7));

          // If the index of the rounding digit is not greater than zero, or xc represents
          // zero, then the result of the base conversion is zero or, if rounding up, a value
          // such as 0.00001.
          if (d < 1 || !xc[0]) {

            // 1^-dp or 0
            str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
          } else {

            // Truncate xc to the required number of decimal places.
            xc.length = d;

            // Round up?
            if (r) {

              // Rounding up may mean the previous digit has to be rounded up and so on.
              for (--baseOut; ++xc[--d] > baseOut;) {
                xc[d] = 0;

                if (!d) {
                  ++e;
                  xc = [1].concat(xc);
                }
              }
            }

            // Determine trailing zeros.
            for (k = xc.length; !xc[--k];);

            // E.g. [4, 11, 15] becomes 4bf.
            for (i = 0, str = ''; i <= k; str += alphabet.charAt(xc[i++]));

            // Add leading zeros, decimal point and trailing zeros as required.
            str = toFixedPoint(str, e, alphabet.charAt(0));
          }

          // The caller will add the sign.
          return str;
        };
      })();


      // Perform division in the specified base. Called by div and convertBase.
      div = (function () {

        // Assume non-zero x and k.
        function multiply(x, k, base) {
          var m, temp, xlo, xhi,
            carry = 0,
            i = x.length,
            klo = k % SQRT_BASE,
            khi = k / SQRT_BASE | 0;

          for (x = x.slice(); i--;) {
            xlo = x[i] % SQRT_BASE;
            xhi = x[i] / SQRT_BASE | 0;
            m = khi * xlo + xhi * klo;
            temp = klo * xlo + ((m % SQRT_BASE) * SQRT_BASE) + carry;
            carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
            x[i] = temp % base;
          }

          if (carry) x = [carry].concat(x);

          return x;
        }

        function compare(a, b, aL, bL) {
          var i, cmp;

          if (aL != bL) {
            cmp = aL > bL ? 1 : -1;
          } else {

            for (i = cmp = 0; i < aL; i++) {

              if (a[i] != b[i]) {
                cmp = a[i] > b[i] ? 1 : -1;
                break;
              }
            }
          }

          return cmp;
        }

        function subtract(a, b, aL, base) {
          var i = 0;

          // Subtract b from a.
          for (; aL--;) {
            a[aL] -= i;
            i = a[aL] < b[aL] ? 1 : 0;
            a[aL] = i * base + a[aL] - b[aL];
          }

          // Remove leading zeros.
          for (; !a[0] && a.length > 1; a.splice(0, 1));
        }

        // x: dividend, y: divisor.
        return function (x, y, dp, rm, base) {
          var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0,
            yL, yz,
            s = x.s == y.s ? 1 : -1,
            xc = x.c,
            yc = y.c;

          // Either NaN, Infinity or 0?
          if (!xc || !xc[0] || !yc || !yc[0]) {

            return new BigNumber(

             // Return NaN if either NaN, or both Infinity or 0.
             !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN :

              // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
              xc && xc[0] == 0 || !yc ? s * 0 : s / 0
           );
          }

          q = new BigNumber(s);
          qc = q.c = [];
          e = x.e - y.e;
          s = dp + e + 1;

          if (!base) {
            base = BASE;
            e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
            s = s / LOG_BASE | 0;
          }

          // Result exponent may be one less then the current value of e.
          // The coefficients of the BigNumbers from convertBase may have trailing zeros.
          for (i = 0; yc[i] == (xc[i] || 0); i++);

          if (yc[i] > (xc[i] || 0)) e--;

          if (s < 0) {
            qc.push(1);
            more = true;
          } else {
            xL = xc.length;
            yL = yc.length;
            i = 0;
            s += 2;

            // Normalise xc and yc so highest order digit of yc is >= base / 2.

            n = mathfloor(base / (yc[0] + 1));

            // Not necessary, but to handle odd bases where yc[0] == (base / 2) - 1.
            // if (n > 1 || n++ == 1 && yc[0] < base / 2) {
            if (n > 1) {
              yc = multiply(yc, n, base);
              xc = multiply(xc, n, base);
              yL = yc.length;
              xL = xc.length;
            }

            xi = yL;
            rem = xc.slice(0, yL);
            remL = rem.length;

            // Add zeros to make remainder as long as divisor.
            for (; remL < yL; rem[remL++] = 0);
            yz = yc.slice();
            yz = [0].concat(yz);
            yc0 = yc[0];
            if (yc[1] >= base / 2) yc0++;
            // Not necessary, but to prevent trial digit n > base, when using base 3.
            // else if (base == 3 && yc0 == 1) yc0 = 1 + 1e-15;

            do {
              n = 0;

              // Compare divisor and remainder.
              cmp = compare(yc, rem, yL, remL);

              // If divisor < remainder.
              if (cmp < 0) {

                // Calculate trial digit, n.

                rem0 = rem[0];
                if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

                // n is how many times the divisor goes into the current remainder.
                n = mathfloor(rem0 / yc0);

                //  Algorithm:
                //  product = divisor multiplied by trial digit (n).
                //  Compare product and remainder.
                //  If product is greater than remainder:
                //    Subtract divisor from product, decrement trial digit.
                //  Subtract product from remainder.
                //  If product was less than remainder at the last compare:
                //    Compare new remainder and divisor.
                //    If remainder is greater than divisor:
                //      Subtract divisor from remainder, increment trial digit.

                if (n > 1) {

                  // n may be > base only when base is 3.
                  if (n >= base) n = base - 1;

                  // product = divisor * trial digit.
                  prod = multiply(yc, n, base);
                  prodL = prod.length;
                  remL = rem.length;

                  // Compare product and remainder.
                  // If product > remainder then trial digit n too high.
                  // n is 1 too high about 5% of the time, and is not known to have
                  // ever been more than 1 too high.
                  while (compare(prod, rem, prodL, remL) == 1) {
                    n--;

                    // Subtract divisor from product.
                    subtract(prod, yL < prodL ? yz : yc, prodL, base);
                    prodL = prod.length;
                    cmp = 1;
                  }
                } else {

                  // n is 0 or 1, cmp is -1.
                  // If n is 0, there is no need to compare yc and rem again below,
                  // so change cmp to 1 to avoid it.
                  // If n is 1, leave cmp as -1, so yc and rem are compared again.
                  if (n == 0) {

                    // divisor < remainder, so n must be at least 1.
                    cmp = n = 1;
                  }

                  // product = divisor
                  prod = yc.slice();
                  prodL = prod.length;
                }

                if (prodL < remL) prod = [0].concat(prod);

                // Subtract product from remainder.
                subtract(rem, prod, remL, base);
                remL = rem.length;

                 // If product was < remainder.
                if (cmp == -1) {

                  // Compare divisor and new remainder.
                  // If divisor < new remainder, subtract divisor from remainder.
                  // Trial digit n too low.
                  // n is 1 too low about 5% of the time, and very rarely 2 too low.
                  while (compare(yc, rem, yL, remL) < 1) {
                    n++;

                    // Subtract divisor from remainder.
                    subtract(rem, yL < remL ? yz : yc, remL, base);
                    remL = rem.length;
                  }
                }
              } else if (cmp === 0) {
                n++;
                rem = [0];
              } // else cmp === 1 and n will be 0

              // Add the next digit, n, to the result array.
              qc[i++] = n;

              // Update the remainder.
              if (rem[0]) {
                rem[remL++] = xc[xi] || 0;
              } else {
                rem = [xc[xi]];
                remL = 1;
              }
            } while ((xi++ < xL || rem[0] != null) && s--);

            more = rem[0] != null;

            // Leading zero?
            if (!qc[0]) qc.splice(0, 1);
          }

          if (base == BASE) {

            // To calculate q.e, first get the number of digits of qc[0].
            for (i = 1, s = qc[0]; s >= 10; s /= 10, i++);

            round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);

          // Caller is convertBase.
          } else {
            q.e = e;
            q.r = +more;
          }

          return q;
        };
      })();


      /*
       * Return a string representing the value of BigNumber n in fixed-point or exponential
       * notation rounded to the specified decimal places or significant digits.
       *
       * n: a BigNumber.
       * i: the index of the last digit required (i.e. the digit that may be rounded up).
       * rm: the rounding mode.
       * id: 1 (toExponential) or 2 (toPrecision).
       */
      function format(n, i, rm, id) {
        var c0, e, ne, len, str;

        if (rm == null) rm = ROUNDING_MODE;
        else intCheck(rm, 0, 8);

        if (!n.c) return n.toString();

        c0 = n.c[0];
        ne = n.e;

        if (i == null) {
          str = coeffToString(n.c);
          str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS)
           ? toExponential(str, ne)
           : toFixedPoint(str, ne, '0');
        } else {
          n = round(new BigNumber(n), i, rm);

          // n.e may have changed if the value was rounded up.
          e = n.e;

          str = coeffToString(n.c);
          len = str.length;

          // toPrecision returns exponential notation if the number of significant digits
          // specified is less than the number of digits necessary to represent the integer
          // part of the value in fixed-point notation.

          // Exponential notation.
          if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {

            // Append zeros?
            for (; len < i; str += '0', len++);
            str = toExponential(str, e);

          // Fixed-point notation.
          } else {
            i -= ne;
            str = toFixedPoint(str, e, '0');

            // Append zeros?
            if (e + 1 > len) {
              if (--i > 0) for (str += '.'; i--; str += '0');
            } else {
              i += e - len;
              if (i > 0) {
                if (e + 1 == len) str += '.';
                for (; i--; str += '0');
              }
            }
          }
        }

        return n.s < 0 && c0 ? '-' + str : str;
      }


      // Handle BigNumber.max and BigNumber.min.
      function maxOrMin(args, method) {
        var n,
          i = 1,
          m = new BigNumber(args[0]);

        for (; i < args.length; i++) {
          n = new BigNumber(args[i]);

          // If any number is NaN, return NaN.
          if (!n.s) {
            m = n;
            break;
          } else if (method.call(m, n)) {
            m = n;
          }
        }

        return m;
      }


      /*
       * Strip trailing zeros, calculate base 10 exponent and check against MIN_EXP and MAX_EXP.
       * Called by minus, plus and times.
       */
      function normalise(n, c, e) {
        var i = 1,
          j = c.length;

         // Remove trailing zeros.
        for (; !c[--j]; c.pop());

        // Calculate the base 10 exponent. First get the number of digits of c[0].
        for (j = c[0]; j >= 10; j /= 10, i++);

        // Overflow?
        if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {

          // Infinity.
          n.c = n.e = null;

        // Underflow?
        } else if (e < MIN_EXP) {

          // Zero.
          n.c = [n.e = 0];
        } else {
          n.e = e;
          n.c = c;
        }

        return n;
      }


      // Handle values that fail the validity test in BigNumber.
      parseNumeric = (function () {
        var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
          dotAfter = /^([^.]+)\.$/,
          dotBefore = /^\.([^.]+)$/,
          isInfinityOrNaN = /^-?(Infinity|NaN)$/,
          whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;

        return function (x, str, isNum, b) {
          var base,
            s = isNum ? str : str.replace(whitespaceOrPlus, '');

          // No exception on ±Infinity or NaN.
          if (isInfinityOrNaN.test(s)) {
            x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
          } else {
            if (!isNum) {

              // basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i
              s = s.replace(basePrefix, function (m, p1, p2) {
                base = (p2 = p2.toLowerCase()) == 'x' ? 16 : p2 == 'b' ? 2 : 8;
                return !b || b == base ? p1 : m;
              });

              if (b) {
                base = b;

                // E.g. '1.' to '1', '.1' to '0.1'
                s = s.replace(dotAfter, '$1').replace(dotBefore, '0.$1');
              }

              if (str != s) return new BigNumber(s, base);
            }

            // '[BigNumber Error] Not a number: {n}'
            // '[BigNumber Error] Not a base {b} number: {n}'
            if (BigNumber.DEBUG) {
              throw Error
                (bignumberError + 'Not a' + (b ? ' base ' + b : '') + ' number: ' + str);
            }

            // NaN
            x.s = null;
          }

          x.c = x.e = null;
        }
      })();


      /*
       * Round x to sd significant digits using rounding mode rm. Check for over/under-flow.
       * If r is truthy, it is known that there are more digits after the rounding digit.
       */
      function round(x, sd, rm, r) {
        var d, i, j, k, n, ni, rd,
          xc = x.c,
          pows10 = POWS_TEN;

        // if x is not Infinity or NaN...
        if (xc) {

          // rd is the rounding digit, i.e. the digit after the digit that may be rounded up.
          // n is a base 1e14 number, the value of the element of array x.c containing rd.
          // ni is the index of n within x.c.
          // d is the number of digits of n.
          // i is the index of rd within n including leading zeros.
          // j is the actual index of rd within n (if < 0, rd is a leading zero).
          out: {

            // Get the number of digits of the first element of xc.
            for (d = 1, k = xc[0]; k >= 10; k /= 10, d++);
            i = sd - d;

            // If the rounding digit is in the first element of xc...
            if (i < 0) {
              i += LOG_BASE;
              j = sd;
              n = xc[ni = 0];

              // Get the rounding digit at index j of n.
              rd = n / pows10[d - j - 1] % 10 | 0;
            } else {
              ni = mathceil((i + 1) / LOG_BASE);

              if (ni >= xc.length) {

                if (r) {

                  // Needed by sqrt.
                  for (; xc.length <= ni; xc.push(0));
                  n = rd = 0;
                  d = 1;
                  i %= LOG_BASE;
                  j = i - LOG_BASE + 1;
                } else {
                  break out;
                }
              } else {
                n = k = xc[ni];

                // Get the number of digits of n.
                for (d = 1; k >= 10; k /= 10, d++);

                // Get the index of rd within n.
                i %= LOG_BASE;

                // Get the index of rd within n, adjusted for leading zeros.
                // The number of leading zeros of n is given by LOG_BASE - d.
                j = i - LOG_BASE + d;

                // Get the rounding digit at index j of n.
                rd = j < 0 ? 0 : n / pows10[d - j - 1] % 10 | 0;
              }
            }

            r = r || sd < 0 ||

            // Are there any non-zero digits after the rounding digit?
            // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
            // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
             xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);

            r = rm < 4
             ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
             : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 &&

              // Check whether the digit to the left of the rounding digit is odd.
              ((i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10) & 1 ||
               rm == (x.s < 0 ? 8 : 7));

            if (sd < 1 || !xc[0]) {
              xc.length = 0;

              if (r) {

                // Convert sd to decimal places.
                sd -= x.e + 1;

                // 1, 0.1, 0.01, 0.001, 0.0001 etc.
                xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
                x.e = -sd || 0;
              } else {

                // Zero.
                xc[0] = x.e = 0;
              }

              return x;
            }

            // Remove excess digits.
            if (i == 0) {
              xc.length = ni;
              k = 1;
              ni--;
            } else {
              xc.length = ni + 1;
              k = pows10[LOG_BASE - i];

              // E.g. 56700 becomes 56000 if 7 is the rounding digit.
              // j > 0 means i > number of leading zeros of n.
              xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
            }

            // Round up?
            if (r) {

              for (; ;) {

                // If the digit to be rounded up is in the first element of xc...
                if (ni == 0) {

                  // i will be the length of xc[0] before k is added.
                  for (i = 1, j = xc[0]; j >= 10; j /= 10, i++);
                  j = xc[0] += k;
                  for (k = 1; j >= 10; j /= 10, k++);

                  // if i != k the length has increased.
                  if (i != k) {
                    x.e++;
                    if (xc[0] == BASE) xc[0] = 1;
                  }

                  break;
                } else {
                  xc[ni] += k;
                  if (xc[ni] != BASE) break;
                  xc[ni--] = 0;
                  k = 1;
                }
              }
            }

            // Remove trailing zeros.
            for (i = xc.length; xc[--i] === 0; xc.pop());
          }

          // Overflow? Infinity.
          if (x.e > MAX_EXP) {
            x.c = x.e = null;

          // Underflow? Zero.
          } else if (x.e < MIN_EXP) {
            x.c = [x.e = 0];
          }
        }

        return x;
      }


      function valueOf(n) {
        var str,
          e = n.e;

        if (e === null) return n.toString();

        str = coeffToString(n.c);

        str = e <= TO_EXP_NEG || e >= TO_EXP_POS
          ? toExponential(str, e)
          : toFixedPoint(str, e, '0');

        return n.s < 0 ? '-' + str : str;
      }


      // PROTOTYPE/INSTANCE METHODS


      /*
       * Return a new BigNumber whose value is the absolute value of this BigNumber.
       */
      P.absoluteValue = P.abs = function () {
        var x = new BigNumber(this);
        if (x.s < 0) x.s = 1;
        return x;
      };


      /*
       * Return
       *   1 if the value of this BigNumber is greater than the value of BigNumber(y, b),
       *   -1 if the value of this BigNumber is less than the value of BigNumber(y, b),
       *   0 if they have the same value,
       *   or null if the value of either is NaN.
       */
      P.comparedTo = function (y, b) {
        return compare(this, new BigNumber(y, b));
      };


      /*
       * If dp is undefined or null or true or false, return the number of decimal places of the
       * value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
       *
       * Otherwise, if dp is a number, return a new BigNumber whose value is the value of this
       * BigNumber rounded to a maximum of dp decimal places using rounding mode rm, or
       * ROUNDING_MODE if rm is omitted.
       *
       * [dp] {number} Decimal places: integer, 0 to MAX inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
       */
      P.decimalPlaces = P.dp = function (dp, rm) {
        var c, n, v,
          x = this;

        if (dp != null) {
          intCheck(dp, 0, MAX);
          if (rm == null) rm = ROUNDING_MODE;
          else intCheck(rm, 0, 8);

          return round(new BigNumber(x), dp + x.e + 1, rm);
        }

        if (!(c = x.c)) return null;
        n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;

        // Subtract the number of trailing zeros of the last number.
        if (v = c[v]) for (; v % 10 == 0; v /= 10, n--);
        if (n < 0) n = 0;

        return n;
      };


      /*
       *  n / 0 = I
       *  n / N = N
       *  n / I = 0
       *  0 / n = 0
       *  0 / 0 = N
       *  0 / N = N
       *  0 / I = 0
       *  N / n = N
       *  N / 0 = N
       *  N / N = N
       *  N / I = N
       *  I / n = I
       *  I / 0 = I
       *  I / N = N
       *  I / I = N
       *
       * Return a new BigNumber whose value is the value of this BigNumber divided by the value of
       * BigNumber(y, b), rounded according to DECIMAL_PLACES and ROUNDING_MODE.
       */
      P.dividedBy = P.div = function (y, b) {
        return div(this, new BigNumber(y, b), DECIMAL_PLACES, ROUNDING_MODE);
      };


      /*
       * Return a new BigNumber whose value is the integer part of dividing the value of this
       * BigNumber by the value of BigNumber(y, b).
       */
      P.dividedToIntegerBy = P.idiv = function (y, b) {
        return div(this, new BigNumber(y, b), 0, 1);
      };


      /*
       * Return a BigNumber whose value is the value of this BigNumber exponentiated by n.
       *
       * If m is present, return the result modulo m.
       * If n is negative round according to DECIMAL_PLACES and ROUNDING_MODE.
       * If POW_PRECISION is non-zero and m is not present, round to POW_PRECISION using ROUNDING_MODE.
       *
       * The modular power operation works efficiently when x, n, and m are integers, otherwise it
       * is equivalent to calculating x.exponentiatedBy(n).modulo(m) with a POW_PRECISION of 0.
       *
       * n {number|string|BigNumber} The exponent. An integer.
       * [m] {number|string|BigNumber} The modulus.
       *
       * '[BigNumber Error] Exponent not an integer: {n}'
       */
      P.exponentiatedBy = P.pow = function (n, m) {
        var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y,
          x = this;

        n = new BigNumber(n);

        // Allow NaN and ±Infinity, but not other non-integers.
        if (n.c && !n.isInteger()) {
          throw Error
            (bignumberError + 'Exponent not an integer: ' + valueOf(n));
        }

        if (m != null) m = new BigNumber(m);

        // Exponent of MAX_SAFE_INTEGER is 15.
        nIsBig = n.e > 14;

        // If x is NaN, ±Infinity, ±0 or ±1, or n is ±Infinity, NaN or ±0.
        if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {

          // The sign of the result of pow when x is negative depends on the evenness of n.
          // If +n overflows to ±Infinity, the evenness of n would be not be known.
          y = new BigNumber(Math.pow(+valueOf(x), nIsBig ? 2 - isOdd(n) : +valueOf(n)));
          return m ? y.mod(m) : y;
        }

        nIsNeg = n.s < 0;

        if (m) {

          // x % m returns NaN if abs(m) is zero, or m is NaN.
          if (m.c ? !m.c[0] : !m.s) return new BigNumber(NaN);

          isModExp = !nIsNeg && x.isInteger() && m.isInteger();

          if (isModExp) x = x.mod(m);

        // Overflow to ±Infinity: >=2**1e10 or >=1.0000024**1e15.
        // Underflow to ±0: <=0.79**1e10 or <=0.9999975**1e15.
        } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0
          // [1, 240000000]
          ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7
          // [80000000000000]  [99999750000000]
          : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {

          // If x is negative and n is odd, k = -0, else k = 0.
          k = x.s < 0 && isOdd(n) ? -0 : 0;

          // If x >= 1, k = ±Infinity.
          if (x.e > -1) k = 1 / k;

          // If n is negative return ±0, else return ±Infinity.
          return new BigNumber(nIsNeg ? 1 / k : k);

        } else if (POW_PRECISION) {

          // Truncating each coefficient array to a length of k after each multiplication
          // equates to truncating significant digits to POW_PRECISION + [28, 41],
          // i.e. there will be a minimum of 28 guard digits retained.
          k = mathceil(POW_PRECISION / LOG_BASE + 2);
        }

        if (nIsBig) {
          half = new BigNumber(0.5);
          if (nIsNeg) n.s = 1;
          nIsOdd = isOdd(n);
        } else {
          i = Math.abs(+valueOf(n));
          nIsOdd = i % 2;
        }

        y = new BigNumber(ONE);

        // Performs 54 loop iterations for n of 9007199254740991.
        for (; ;) {

          if (nIsOdd) {
            y = y.times(x);
            if (!y.c) break;

            if (k) {
              if (y.c.length > k) y.c.length = k;
            } else if (isModExp) {
              y = y.mod(m);    //y = y.minus(div(y, m, 0, MODULO_MODE).times(m));
            }
          }

          if (i) {
            i = mathfloor(i / 2);
            if (i === 0) break;
            nIsOdd = i % 2;
          } else {
            n = n.times(half);
            round(n, n.e + 1, 1);

            if (n.e > 14) {
              nIsOdd = isOdd(n);
            } else {
              i = +valueOf(n);
              if (i === 0) break;
              nIsOdd = i % 2;
            }
          }

          x = x.times(x);

          if (k) {
            if (x.c && x.c.length > k) x.c.length = k;
          } else if (isModExp) {
            x = x.mod(m);    //x = x.minus(div(x, m, 0, MODULO_MODE).times(m));
          }
        }

        if (isModExp) return y;
        if (nIsNeg) y = ONE.div(y);

        return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
      };


      /*
       * Return a new BigNumber whose value is the value of this BigNumber rounded to an integer
       * using rounding mode rm, or ROUNDING_MODE if rm is omitted.
       *
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {rm}'
       */
      P.integerValue = function (rm) {
        var n = new BigNumber(this);
        if (rm == null) rm = ROUNDING_MODE;
        else intCheck(rm, 0, 8);
        return round(n, n.e + 1, rm);
      };


      /*
       * Return true if the value of this BigNumber is equal to the value of BigNumber(y, b),
       * otherwise return false.
       */
      P.isEqualTo = P.eq = function (y, b) {
        return compare(this, new BigNumber(y, b)) === 0;
      };


      /*
       * Return true if the value of this BigNumber is a finite number, otherwise return false.
       */
      P.isFinite = function () {
        return !!this.c;
      };


      /*
       * Return true if the value of this BigNumber is greater than the value of BigNumber(y, b),
       * otherwise return false.
       */
      P.isGreaterThan = P.gt = function (y, b) {
        return compare(this, new BigNumber(y, b)) > 0;
      };


      /*
       * Return true if the value of this BigNumber is greater than or equal to the value of
       * BigNumber(y, b), otherwise return false.
       */
      P.isGreaterThanOrEqualTo = P.gte = function (y, b) {
        return (b = compare(this, new BigNumber(y, b))) === 1 || b === 0;

      };


      /*
       * Return true if the value of this BigNumber is an integer, otherwise return false.
       */
      P.isInteger = function () {
        return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
      };


      /*
       * Return true if the value of this BigNumber is less than the value of BigNumber(y, b),
       * otherwise return false.
       */
      P.isLessThan = P.lt = function (y, b) {
        return compare(this, new BigNumber(y, b)) < 0;
      };


      /*
       * Return true if the value of this BigNumber is less than or equal to the value of
       * BigNumber(y, b), otherwise return false.
       */
      P.isLessThanOrEqualTo = P.lte = function (y, b) {
        return (b = compare(this, new BigNumber(y, b))) === -1 || b === 0;
      };


      /*
       * Return true if the value of this BigNumber is NaN, otherwise return false.
       */
      P.isNaN = function () {
        return !this.s;
      };


      /*
       * Return true if the value of this BigNumber is negative, otherwise return false.
       */
      P.isNegative = function () {
        return this.s < 0;
      };


      /*
       * Return true if the value of this BigNumber is positive, otherwise return false.
       */
      P.isPositive = function () {
        return this.s > 0;
      };


      /*
       * Return true if the value of this BigNumber is 0 or -0, otherwise return false.
       */
      P.isZero = function () {
        return !!this.c && this.c[0] == 0;
      };


      /*
       *  n - 0 = n
       *  n - N = N
       *  n - I = -I
       *  0 - n = -n
       *  0 - 0 = 0
       *  0 - N = N
       *  0 - I = -I
       *  N - n = N
       *  N - 0 = N
       *  N - N = N
       *  N - I = N
       *  I - n = I
       *  I - 0 = I
       *  I - N = N
       *  I - I = N
       *
       * Return a new BigNumber whose value is the value of this BigNumber minus the value of
       * BigNumber(y, b).
       */
      P.minus = function (y, b) {
        var i, j, t, xLTy,
          x = this,
          a = x.s;

        y = new BigNumber(y, b);
        b = y.s;

        // Either NaN?
        if (!a || !b) return new BigNumber(NaN);

        // Signs differ?
        if (a != b) {
          y.s = -b;
          return x.plus(y);
        }

        var xe = x.e / LOG_BASE,
          ye = y.e / LOG_BASE,
          xc = x.c,
          yc = y.c;

        if (!xe || !ye) {

          // Either Infinity?
          if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber(yc ? x : NaN);

          // Either zero?
          if (!xc[0] || !yc[0]) {

            // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
            return yc[0] ? (y.s = -b, y) : new BigNumber(xc[0] ? x :

             // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
             ROUNDING_MODE == 3 ? -0 : 0);
          }
        }

        xe = bitFloor(xe);
        ye = bitFloor(ye);
        xc = xc.slice();

        // Determine which is the bigger number.
        if (a = xe - ye) {

          if (xLTy = a < 0) {
            a = -a;
            t = xc;
          } else {
            ye = xe;
            t = yc;
          }

          t.reverse();

          // Prepend zeros to equalise exponents.
          for (b = a; b--; t.push(0));
          t.reverse();
        } else {

          // Exponents equal. Check digit by digit.
          j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;

          for (a = b = 0; b < j; b++) {

            if (xc[b] != yc[b]) {
              xLTy = xc[b] < yc[b];
              break;
            }
          }
        }

        // x < y? Point xc to the array of the bigger number.
        if (xLTy) t = xc, xc = yc, yc = t, y.s = -y.s;

        b = (j = yc.length) - (i = xc.length);

        // Append zeros to xc if shorter.
        // No need to add zeros to yc if shorter as subtract only needs to start at yc.length.
        if (b > 0) for (; b--; xc[i++] = 0);
        b = BASE - 1;

        // Subtract yc from xc.
        for (; j > a;) {

          if (xc[--j] < yc[j]) {
            for (i = j; i && !xc[--i]; xc[i] = b);
            --xc[i];
            xc[j] += BASE;
          }

          xc[j] -= yc[j];
        }

        // Remove leading zeros and adjust exponent accordingly.
        for (; xc[0] == 0; xc.splice(0, 1), --ye);

        // Zero?
        if (!xc[0]) {

          // Following IEEE 754 (2008) 6.3,
          // n - n = +0  but  n - n = -0  when rounding towards -Infinity.
          y.s = ROUNDING_MODE == 3 ? -1 : 1;
          y.c = [y.e = 0];
          return y;
        }

        // No need to check for Infinity as +x - +y != Infinity && -x - -y != Infinity
        // for finite x and y.
        return normalise(y, xc, ye);
      };


      /*
       *   n % 0 =  N
       *   n % N =  N
       *   n % I =  n
       *   0 % n =  0
       *  -0 % n = -0
       *   0 % 0 =  N
       *   0 % N =  N
       *   0 % I =  0
       *   N % n =  N
       *   N % 0 =  N
       *   N % N =  N
       *   N % I =  N
       *   I % n =  N
       *   I % 0 =  N
       *   I % N =  N
       *   I % I =  N
       *
       * Return a new BigNumber whose value is the value of this BigNumber modulo the value of
       * BigNumber(y, b). The result depends on the value of MODULO_MODE.
       */
      P.modulo = P.mod = function (y, b) {
        var q, s,
          x = this;

        y = new BigNumber(y, b);

        // Return NaN if x is Infinity or NaN, or y is NaN or zero.
        if (!x.c || !y.s || y.c && !y.c[0]) {
          return new BigNumber(NaN);

        // Return x if y is Infinity or x is zero.
        } else if (!y.c || x.c && !x.c[0]) {
          return new BigNumber(x);
        }

        if (MODULO_MODE == 9) {

          // Euclidian division: q = sign(y) * floor(x / abs(y))
          // r = x - qy    where  0 <= r < abs(y)
          s = y.s;
          y.s = 1;
          q = div(x, y, 0, 3);
          y.s = s;
          q.s *= s;
        } else {
          q = div(x, y, 0, MODULO_MODE);
        }

        y = x.minus(q.times(y));

        // To match JavaScript %, ensure sign of zero is sign of dividend.
        if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;

        return y;
      };


      /*
       *  n * 0 = 0
       *  n * N = N
       *  n * I = I
       *  0 * n = 0
       *  0 * 0 = 0
       *  0 * N = N
       *  0 * I = N
       *  N * n = N
       *  N * 0 = N
       *  N * N = N
       *  N * I = N
       *  I * n = I
       *  I * 0 = N
       *  I * N = N
       *  I * I = I
       *
       * Return a new BigNumber whose value is the value of this BigNumber multiplied by the value
       * of BigNumber(y, b).
       */
      P.multipliedBy = P.times = function (y, b) {
        var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc,
          base, sqrtBase,
          x = this,
          xc = x.c,
          yc = (y = new BigNumber(y, b)).c;

        // Either NaN, ±Infinity or ±0?
        if (!xc || !yc || !xc[0] || !yc[0]) {

          // Return NaN if either is NaN, or one is 0 and the other is Infinity.
          if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
            y.c = y.e = y.s = null;
          } else {
            y.s *= x.s;

            // Return ±Infinity if either is ±Infinity.
            if (!xc || !yc) {
              y.c = y.e = null;

            // Return ±0 if either is ±0.
            } else {
              y.c = [0];
              y.e = 0;
            }
          }

          return y;
        }

        e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
        y.s *= x.s;
        xcL = xc.length;
        ycL = yc.length;

        // Ensure xc points to longer array and xcL to its length.
        if (xcL < ycL) zc = xc, xc = yc, yc = zc, i = xcL, xcL = ycL, ycL = i;

        // Initialise the result array with zeros.
        for (i = xcL + ycL, zc = []; i--; zc.push(0));

        base = BASE;
        sqrtBase = SQRT_BASE;

        for (i = ycL; --i >= 0;) {
          c = 0;
          ylo = yc[i] % sqrtBase;
          yhi = yc[i] / sqrtBase | 0;

          for (k = xcL, j = i + k; j > i;) {
            xlo = xc[--k] % sqrtBase;
            xhi = xc[k] / sqrtBase | 0;
            m = yhi * xlo + xhi * ylo;
            xlo = ylo * xlo + ((m % sqrtBase) * sqrtBase) + zc[j] + c;
            c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
            zc[j--] = xlo % base;
          }

          zc[j] = c;
        }

        if (c) {
          ++e;
        } else {
          zc.splice(0, 1);
        }

        return normalise(y, zc, e);
      };


      /*
       * Return a new BigNumber whose value is the value of this BigNumber negated,
       * i.e. multiplied by -1.
       */
      P.negated = function () {
        var x = new BigNumber(this);
        x.s = -x.s || null;
        return x;
      };


      /*
       *  n + 0 = n
       *  n + N = N
       *  n + I = I
       *  0 + n = n
       *  0 + 0 = 0
       *  0 + N = N
       *  0 + I = I
       *  N + n = N
       *  N + 0 = N
       *  N + N = N
       *  N + I = N
       *  I + n = I
       *  I + 0 = I
       *  I + N = N
       *  I + I = I
       *
       * Return a new BigNumber whose value is the value of this BigNumber plus the value of
       * BigNumber(y, b).
       */
      P.plus = function (y, b) {
        var t,
          x = this,
          a = x.s;

        y = new BigNumber(y, b);
        b = y.s;

        // Either NaN?
        if (!a || !b) return new BigNumber(NaN);

        // Signs differ?
         if (a != b) {
          y.s = -b;
          return x.minus(y);
        }

        var xe = x.e / LOG_BASE,
          ye = y.e / LOG_BASE,
          xc = x.c,
          yc = y.c;

        if (!xe || !ye) {

          // Return ±Infinity if either ±Infinity.
          if (!xc || !yc) return new BigNumber(a / 0);

          // Either zero?
          // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
          if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber(xc[0] ? x : a * 0);
        }

        xe = bitFloor(xe);
        ye = bitFloor(ye);
        xc = xc.slice();

        // Prepend zeros to equalise exponents. Faster to use reverse then do unshifts.
        if (a = xe - ye) {
          if (a > 0) {
            ye = xe;
            t = yc;
          } else {
            a = -a;
            t = xc;
          }

          t.reverse();
          for (; a--; t.push(0));
          t.reverse();
        }

        a = xc.length;
        b = yc.length;

        // Point xc to the longer array, and b to the shorter length.
        if (a - b < 0) t = yc, yc = xc, xc = t, b = a;

        // Only start adding at yc.length - 1 as the further digits of xc can be ignored.
        for (a = 0; b;) {
          a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
          xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
        }

        if (a) {
          xc = [a].concat(xc);
          ++ye;
        }

        // No need to check for zero, as +x + +y != 0 && -x + -y != 0
        // ye = MAX_EXP + 1 possible
        return normalise(y, xc, ye);
      };


      /*
       * If sd is undefined or null or true or false, return the number of significant digits of
       * the value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
       * If sd is true include integer-part trailing zeros in the count.
       *
       * Otherwise, if sd is a number, return a new BigNumber whose value is the value of this
       * BigNumber rounded to a maximum of sd significant digits using rounding mode rm, or
       * ROUNDING_MODE if rm is omitted.
       *
       * sd {number|boolean} number: significant digits: integer, 1 to MAX inclusive.
       *                     boolean: whether to count integer-part trailing zeros: true or false.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
       */
      P.precision = P.sd = function (sd, rm) {
        var c, n, v,
          x = this;

        if (sd != null && sd !== !!sd) {
          intCheck(sd, 1, MAX);
          if (rm == null) rm = ROUNDING_MODE;
          else intCheck(rm, 0, 8);

          return round(new BigNumber(x), sd, rm);
        }

        if (!(c = x.c)) return null;
        v = c.length - 1;
        n = v * LOG_BASE + 1;

        if (v = c[v]) {

          // Subtract the number of trailing zeros of the last element.
          for (; v % 10 == 0; v /= 10, n--);

          // Add the number of digits of the first element.
          for (v = c[0]; v >= 10; v /= 10, n++);
        }

        if (sd && x.e + 1 > n) n = x.e + 1;

        return n;
      };


      /*
       * Return a new BigNumber whose value is the value of this BigNumber shifted by k places
       * (powers of 10). Shift to the right if n > 0, and to the left if n < 0.
       *
       * k {number} Integer, -MAX_SAFE_INTEGER to MAX_SAFE_INTEGER inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {k}'
       */
      P.shiftedBy = function (k) {
        intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
        return this.times('1e' + k);
      };


      /*
       *  sqrt(-n) =  N
       *  sqrt(N) =  N
       *  sqrt(-I) =  N
       *  sqrt(I) =  I
       *  sqrt(0) =  0
       *  sqrt(-0) = -0
       *
       * Return a new BigNumber whose value is the square root of the value of this BigNumber,
       * rounded according to DECIMAL_PLACES and ROUNDING_MODE.
       */
      P.squareRoot = P.sqrt = function () {
        var m, n, r, rep, t,
          x = this,
          c = x.c,
          s = x.s,
          e = x.e,
          dp = DECIMAL_PLACES + 4,
          half = new BigNumber('0.5');

        // Negative/NaN/Infinity/zero?
        if (s !== 1 || !c || !c[0]) {
          return new BigNumber(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
        }

        // Initial estimate.
        s = Math.sqrt(+valueOf(x));

        // Math.sqrt underflow/overflow?
        // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
        if (s == 0 || s == 1 / 0) {
          n = coeffToString(c);
          if ((n.length + e) % 2 == 0) n += '0';
          s = Math.sqrt(+n);
          e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);

          if (s == 1 / 0) {
            n = '5e' + e;
          } else {
            n = s.toExponential();
            n = n.slice(0, n.indexOf('e') + 1) + e;
          }

          r = new BigNumber(n);
        } else {
          r = new BigNumber(s + '');
        }

        // Check for zero.
        // r could be zero if MIN_EXP is changed after the this value was created.
        // This would cause a division by zero (x/t) and hence Infinity below, which would cause
        // coeffToString to throw.
        if (r.c[0]) {
          e = r.e;
          s = e + dp;
          if (s < 3) s = 0;

          // Newton-Raphson iteration.
          for (; ;) {
            t = r;
            r = half.times(t.plus(div(x, t, dp, 1)));

            if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {

              // The exponent of r may here be one less than the final result exponent,
              // e.g 0.0009999 (e-4) --> 0.001 (e-3), so adjust s so the rounding digits
              // are indexed correctly.
              if (r.e < e) --s;
              n = n.slice(s - 3, s + 1);

              // The 4th rounding digit may be in error by -1 so if the 4 rounding digits
              // are 9999 or 4999 (i.e. approaching a rounding boundary) continue the
              // iteration.
              if (n == '9999' || !rep && n == '4999') {

                // On the first iteration only, check to see if rounding up gives the
                // exact result as the nines may infinitely repeat.
                if (!rep) {
                  round(t, t.e + DECIMAL_PLACES + 2, 0);

                  if (t.times(t).eq(x)) {
                    r = t;
                    break;
                  }
                }

                dp += 4;
                s += 4;
                rep = 1;
              } else {

                // If rounding digits are null, 0{0,4} or 50{0,3}, check for exact
                // result. If not, then there are further digits and m will be truthy.
                if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                  // Truncate to the first rounding digit.
                  round(r, r.e + DECIMAL_PLACES + 2, 1);
                  m = !r.times(r).eq(x);
                }

                break;
              }
            }
          }
        }

        return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
      };


      /*
       * Return a string representing the value of this BigNumber in exponential notation and
       * rounded using ROUNDING_MODE to dp fixed decimal places.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
       */
      P.toExponential = function (dp, rm) {
        if (dp != null) {
          intCheck(dp, 0, MAX);
          dp++;
        }
        return format(this, dp, rm, 1);
      };


      /*
       * Return a string representing the value of this BigNumber in fixed-point notation rounding
       * to dp fixed decimal places using rounding mode rm, or ROUNDING_MODE if rm is omitted.
       *
       * Note: as with JavaScript's number type, (-0).toFixed(0) is '0',
       * but e.g. (-0.00001).toFixed(0) is '-0'.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
       */
      P.toFixed = function (dp, rm) {
        if (dp != null) {
          intCheck(dp, 0, MAX);
          dp = dp + this.e + 1;
        }
        return format(this, dp, rm);
      };


      /*
       * Return a string representing the value of this BigNumber in fixed-point notation rounded
       * using rm or ROUNDING_MODE to dp decimal places, and formatted according to the properties
       * of the format or FORMAT object (see BigNumber.set).
       *
       * The formatting object may contain some or all of the properties shown below.
       *
       * FORMAT = {
       *   prefix: '',
       *   groupSize: 3,
       *   secondaryGroupSize: 0,
       *   groupSeparator: ',',
       *   decimalSeparator: '.',
       *   fractionGroupSize: 0,
       *   fractionGroupSeparator: '\xA0',      // non-breaking space
       *   suffix: ''
       * };
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       * [format] {object} Formatting options. See FORMAT pbject above.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
       * '[BigNumber Error] Argument not an object: {format}'
       */
      P.toFormat = function (dp, rm, format) {
        var str,
          x = this;

        if (format == null) {
          if (dp != null && rm && typeof rm == 'object') {
            format = rm;
            rm = null;
          } else if (dp && typeof dp == 'object') {
            format = dp;
            dp = rm = null;
          } else {
            format = FORMAT;
          }
        } else if (typeof format != 'object') {
          throw Error
            (bignumberError + 'Argument not an object: ' + format);
        }

        str = x.toFixed(dp, rm);

        if (x.c) {
          var i,
            arr = str.split('.'),
            g1 = +format.groupSize,
            g2 = +format.secondaryGroupSize,
            groupSeparator = format.groupSeparator || '',
            intPart = arr[0],
            fractionPart = arr[1],
            isNeg = x.s < 0,
            intDigits = isNeg ? intPart.slice(1) : intPart,
            len = intDigits.length;

          if (g2) i = g1, g1 = g2, g2 = i, len -= i;

          if (g1 > 0 && len > 0) {
            i = len % g1 || g1;
            intPart = intDigits.substr(0, i);
            for (; i < len; i += g1) intPart += groupSeparator + intDigits.substr(i, g1);
            if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
            if (isNeg) intPart = '-' + intPart;
          }

          str = fractionPart
           ? intPart + (format.decimalSeparator || '') + ((g2 = +format.fractionGroupSize)
            ? fractionPart.replace(new RegExp('\\d{' + g2 + '}\\B', 'g'),
             '$&' + (format.fractionGroupSeparator || ''))
            : fractionPart)
           : intPart;
        }

        return (format.prefix || '') + str + (format.suffix || '');
      };


      /*
       * Return an array of two BigNumbers representing the value of this BigNumber as a simple
       * fraction with an integer numerator and an integer denominator.
       * The denominator will be a positive non-zero value less than or equal to the specified
       * maximum denominator. If a maximum denominator is not specified, the denominator will be
       * the lowest value necessary to represent the number exactly.
       *
       * [md] {number|string|BigNumber} Integer >= 1, or Infinity. The maximum denominator.
       *
       * '[BigNumber Error] Argument {not an integer|out of range} : {md}'
       */
      P.toFraction = function (md) {
        var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s,
          x = this,
          xc = x.c;

        if (md != null) {
          n = new BigNumber(md);

          // Throw if md is less than one or is not an integer, unless it is Infinity.
          if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
            throw Error
              (bignumberError + 'Argument ' +
                (n.isInteger() ? 'out of range: ' : 'not an integer: ') + valueOf(n));
          }
        }

        if (!xc) return new BigNumber(x);

        d = new BigNumber(ONE);
        n1 = d0 = new BigNumber(ONE);
        d1 = n0 = new BigNumber(ONE);
        s = coeffToString(xc);

        // Determine initial denominator.
        // d is a power of 10 and the minimum max denominator that specifies the value exactly.
        e = d.e = s.length - x.e - 1;
        d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
        md = !md || n.comparedTo(d) > 0 ? (e > 0 ? d : n1) : n;

        exp = MAX_EXP;
        MAX_EXP = 1 / 0;
        n = new BigNumber(s);

        // n0 = d1 = 0
        n0.c[0] = 0;

        for (; ;)  {
          q = div(n, d, 0, 1);
          d2 = d0.plus(q.times(d1));
          if (d2.comparedTo(md) == 1) break;
          d0 = d1;
          d1 = d2;
          n1 = n0.plus(q.times(d2 = n1));
          n0 = d2;
          d = n.minus(q.times(d2 = d));
          n = d2;
        }

        d2 = div(md.minus(d0), d1, 0, 1);
        n0 = n0.plus(d2.times(n1));
        d0 = d0.plus(d2.times(d1));
        n0.s = n1.s = x.s;
        e = e * 2;

        // Determine which fraction is closer to x, n0/d0 or n1/d1
        r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
            div(n0, d0, e, ROUNDING_MODE).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];

        MAX_EXP = exp;

        return r;
      };


      /*
       * Return the value of this BigNumber converted to a number primitive.
       */
      P.toNumber = function () {
        return +valueOf(this);
      };


      /*
       * Return a string representing the value of this BigNumber rounded to sd significant digits
       * using rounding mode rm or ROUNDING_MODE. If sd is less than the number of digits
       * necessary to represent the integer part of the value in fixed-point notation, then use
       * exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
       */
      P.toPrecision = function (sd, rm) {
        if (sd != null) intCheck(sd, 1, MAX);
        return format(this, sd, rm, 2);
      };


      /*
       * Return a string representing the value of this BigNumber in base b, or base 10 if b is
       * omitted. If a base is specified, including base 10, round according to DECIMAL_PLACES and
       * ROUNDING_MODE. If a base is not specified, and this BigNumber has a positive exponent
       * that is equal to or greater than TO_EXP_POS, or a negative exponent equal to or less than
       * TO_EXP_NEG, return exponential notation.
       *
       * [b] {number} Integer, 2 to ALPHABET.length inclusive.
       *
       * '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
       */
      P.toString = function (b) {
        var str,
          n = this,
          s = n.s,
          e = n.e;

        // Infinity or NaN?
        if (e === null) {
          if (s) {
            str = 'Infinity';
            if (s < 0) str = '-' + str;
          } else {
            str = 'NaN';
          }
        } else {
          if (b == null) {
            str = e <= TO_EXP_NEG || e >= TO_EXP_POS
             ? toExponential(coeffToString(n.c), e)
             : toFixedPoint(coeffToString(n.c), e, '0');
          } else if (b === 10) {
            n = round(new BigNumber(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
            str = toFixedPoint(coeffToString(n.c), n.e, '0');
          } else {
            intCheck(b, 2, ALPHABET.length, 'Base');
            str = convertBase(toFixedPoint(coeffToString(n.c), e, '0'), 10, b, s, true);
          }

          if (s < 0 && n.c[0]) str = '-' + str;
        }

        return str;
      };


      /*
       * Return as toString, but do not accept a base argument, and include the minus sign for
       * negative zero.
       */
      P.valueOf = P.toJSON = function () {
        return valueOf(this);
      };


      P._isBigNumber = true;

      P[Symbol.toStringTag] = 'BigNumber';

      // Node.js v10.12.0+
      P[Symbol.for('nodejs.util.inspect.custom')] = P.valueOf;

      if (configObject != null) BigNumber.set(configObject);

      return BigNumber;
    }


    // PRIVATE HELPER FUNCTIONS

    // These functions don't need access to variables,
    // e.g. DECIMAL_PLACES, in the scope of the `clone` function above.


    function bitFloor(n) {
      var i = n | 0;
      return n > 0 || n === i ? i : i - 1;
    }


    // Return a coefficient array as a string of base 10 digits.
    function coeffToString(a) {
      var s, z,
        i = 1,
        j = a.length,
        r = a[0] + '';

      for (; i < j;) {
        s = a[i++] + '';
        z = LOG_BASE - s.length;
        for (; z--; s = '0' + s);
        r += s;
      }

      // Determine trailing zeros.
      for (j = r.length; r.charCodeAt(--j) === 48;);

      return r.slice(0, j + 1 || 1);
    }


    // Compare the value of BigNumbers x and y.
    function compare(x, y) {
      var a, b,
        xc = x.c,
        yc = y.c,
        i = x.s,
        j = y.s,
        k = x.e,
        l = y.e;

      // Either NaN?
      if (!i || !j) return null;

      a = xc && !xc[0];
      b = yc && !yc[0];

      // Either zero?
      if (a || b) return a ? b ? 0 : -j : i;

      // Signs differ?
      if (i != j) return i;

      a = i < 0;
      b = k == l;

      // Either Infinity?
      if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;

      // Compare exponents.
      if (!b) return k > l ^ a ? 1 : -1;

      j = (k = xc.length) < (l = yc.length) ? k : l;

      // Compare digit by digit.
      for (i = 0; i < j; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a ? 1 : -1;

      // Compare lengths.
      return k == l ? 0 : k > l ^ a ? 1 : -1;
    }


    /*
     * Check that n is a primitive number, an integer, and in range, otherwise throw.
     */
    function intCheck(n, min, max, name) {
      if (n < min || n > max || n !== mathfloor(n)) {
        throw Error
         (bignumberError + (name || 'Argument') + (typeof n == 'number'
           ? n < min || n > max ? ' out of range: ' : ' not an integer: '
           : ' not a primitive number: ') + String(n));
      }
    }


    // Assumes finite n.
    function isOdd(n) {
      var k = n.c.length - 1;
      return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
    }


    function toExponential(str, e) {
      return (str.length > 1 ? str.charAt(0) + '.' + str.slice(1) : str) +
       (e < 0 ? 'e' : 'e+') + e;
    }


    function toFixedPoint(str, e, z) {
      var len, zs;

      // Negative exponent?
      if (e < 0) {

        // Prepend zeros.
        for (zs = z + '.'; ++e; zs += z);
        str = zs + str;

      // Positive exponent
      } else {
        len = str.length;

        // Append zeros.
        if (++e > len) {
          for (zs = z, e -= len; --e; zs += z);
          str += zs;
        } else if (e < len) {
          str = str.slice(0, e) + '.' + str.slice(e);
        }
      }

      return str;
    }


    // EXPORT


    var BigNumber = clone();

    var bignumber = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BigNumber: BigNumber,
                'default': BigNumber
    });

    var BigNumber$1 = getCjsExportFromNamespace(bignumber);

    BigNumber$1.config({ RANGE: [-30, 30], EXPONENTIAL_AT: 1e+9 });
    BigNumber$1.set({ DECIMAL_PLACES: 30, ROUNDING_MODE: BigNumber$1.ROUND_DOWN });    // equivalent

    function Encoder (type, value) {
        const throwError = (val) => {
            throw new Error(`Error encoding ${val} to ${type}`)
        };
        const countDecimals = (n) => {
            if(Math.floor(n) === n) return 0;
            try{
                return n.toString().split(".")[1].length
            }catch (e){
                return 0
            } 
        };
        const isString = (val) => typeof val === 'string' || val instanceof String;
        const isArray = (val) => val && typeof val === 'object' && val.constructor === Array;
        const isObject = (val) => val && typeof val === 'object' && val.constructor === Object;
        const isDate = (val) => val instanceof Date;
        const isBoolean = (val) => typeof val === 'boolean';

        const isNumber = (val) => {
            if (isArray(val)) return false
            return !isNaN(encodeBigNumber(val).toNumber())
        };

        const isInteger = (val) => {
            if (!isNumber(val)) return false
            if (countDecimals(val) === 0) return true
            return false
        };
        const encodeInt = (val) => {
            if (!isNumber(val)) throwError(val);
            else return parseInt(val)
        };
        const isFloat = (val) => {
            if (!isNumber(val)) return false
            if (countDecimals(val) === 0) return false
            return true
        };
        const encodeFloat = (val) => {
            if(!isNumber(val)) throwError(val);
            if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);

            return {"__fixed__": val.toFixed(30).replace(/^0+(\d)|(\d)0+$/gm, '$1$2')}
        };
        const encodeNumber = (val) => {
            if(!isNumber(val)) throwError(val);
            if (isFloat(val)) {
                if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);
                return {"__fixed__": val.toFixed(30).replace(/^0+(\d)|(\d)0+$/gm, '$1$2')}
            }
            if (isInteger(val)) return parseInt(val)   
        };
        const encodeBigNumber = (val) => {
            if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);
            return val
        };

        const encodeBool = (val) => {
            if (isBoolean(val)) return val
            if (val === 'true' || val === 1) return true
            if (val === 'false' || val === 0) return false
            throwError(val);
        };
        const encodeStr = (val) => {
            if (isString(val)) return val
            if (isDate(val)) return val.toISOString()
            return JSON.stringify(val)
        };
        const encodeDateTime = (val) => {
            val = !isDate(val) ? new Date(val) : val;
            if (!isDate(val)) throwError(val);
            return {'__time__': [
                val.getUTCFullYear(), 
                val.getUTCMonth(), 
                val.getUTCDate(), 
                val.getUTCHours(), 
                val.getUTCMinutes(), 
                val.getUTCSeconds(), 
                val.getUTCMilliseconds()
            ]}
        };
        const encodeTimeDelta = (val) => {
            const time = isDate(val) ? val.getTime() : new Date(val).getTime();
            const days = parseInt(time  / 1000 / 60 / 60 / 24);
            const seconds = (time - (days * 24 * 60 * 60 * 1000)) / 1000;
            return {'__delta__':[days, seconds]}
        };

        const encodeList = (val) => {
            if (isArray(val)) return parseObject(val)
            try{
                val = JSON.parse(val);
            }catch(e){
                throwError(val);
            }
            if (isArray(val)) return parseObject(val)
            throwError(val);
        };

        const encodeDict = (val) => {
            if (isObject(val)) return parseObject(val)
            try{
                val = JSON.parse(val);
            }catch(e){
                throwError(val);
            }
            if (isObject(val)) return parseObject(val)
            throwError(val);
        };

        const encodeObject = (val) => {
            try {
                return encodeList(val)
            }catch(e){
                return encodeDict(val)
            }
        };

        function parseObject (obj) {
            const encode = (k, v) => {
                if (k === "datetime" || k === "datetime.datetime" ) return Encoder("datetime.datetime", v)
                if (k === "timedelta" || k === "datetime.timedelta") return Encoder("datetime.timedelta", v)
                if (k !== "__fixed__" && isFloat(v)) return encodeFloat(v)
                return v
            };
        
            const fixDatetime = (k, v) => {
                const isDatetimeObject = (val) => {
                    let datetimeTypes = ['datetime.datetime', 'datetime', 'datetime.timedelta', 'timedelta'];
                    return Object.keys(val).length === 1 && datetimeTypes.filter(f => f === Object.keys(val)[0]).length > 0

                };

                if (v.constructor === Array) {
                    v.map(val => {
                        if (Object.keys(val).length === 1 && isDatetimeObject(v)) return val[Object.keys(val)[0]]
                        //if (isFloat(val)) return encodeFloat(val)
                        return val
                    });
                }
                if (v.constructor === Object) {
                    if (Object.keys(v).length === 1 && isDatetimeObject(v)) return v[Object.keys(v)[0]]
                }

                //if (isFloat(v)) return encodeFloat(v)

                return v
            };
        
            let encodeValues = JSON.stringify(obj, encode);
            return JSON.parse(encodeValues, fixDatetime)
        }

        const encoder = {
            str: encodeStr,
            string: encodeStr,
            float: encodeFloat,
            int: encodeInt,
            bool: encodeBool,
            boolean: encodeBool,
            dict: encodeDict,
            list: encodeList,
            Any: () => value,
            "datetime.timedelta": encodeTimeDelta, 
            "datetime.datetime": encodeDateTime,
            timedelta: encodeTimeDelta, 
            datetime: encodeDateTime,
            number: encodeNumber,
            object: encodeObject,
            bigNumber: encodeBigNumber,
        };
        
        if (Object.keys(encoder).includes(type)) return encoder[type](value)
        else throw new Error(`Error: ${type} is not a valid encoder type.`)
    }

    Encoder.BigNumber = BigNumber$1;

    var encoder = {
        Encoder
    };
    var encoder_1 = encoder.Encoder;

    const { validateTypes } = validators;
    const fetch = browser.default;

    class LamdenMasterNode_API{
        constructor(networkInfoObj){
            if (!validateTypes.isObjectWithKeys(networkInfoObj)) throw new Error(`Expected Object and got Type: ${typeof networkInfoObj}`)
            if (!validateTypes.isArrayWithValues(networkInfoObj.hosts)) throw new Error(`HOSTS Required (Type: Array)`)

            this.hosts = this.validateHosts(networkInfoObj.hosts);        
        }
        //This will throw an error if the protocol wasn't included in the host string
        vaidateProtocol(host){
            let protocols = ['https://', 'http://'];
            if (protocols.map(protocol => host.includes(protocol)).includes(true)) return host
            throw new Error('Host String must include http:// or https://')
        }
        validateHosts(hosts){
            return hosts.map(host => this.vaidateProtocol(host.toLowerCase()))
        }

        get host() {return this.hosts[Math.floor(Math.random() * this.hosts.length)]}
        get url() {return this.host}

        send(method, path, data, overrideURL, callback){
            let parms = '';
            if (Object.keys(data).includes('parms')) {
                parms = this.createParms(data.parms);
            }

            let options = {};
            if (method === 'POST'){
                let headers = {'Content-Type': 'application/json'};
                options.method = method;
                options.headers = headers;
                options.body = data;
            }

            return fetch(`${overrideURL ? overrideURL : this.url}${path}${parms}`, options)
                .then(res => {
                    return res.json()
                } )
                .then(json => {
                        return callback(json, undefined)
                })
                .catch(err => {
                        return callback(undefined, err.toString())
                    })
        }

        createParms(parms){
            if (Object.keys(parms).length === 0) return ''
            let parmString = '?';
            Object.keys(parms).forEach(key => {
                parmString = `${parmString}${key}=${parms[key]}&`;
            });
            return parmString.slice(0, -1);
        }

        async getContractInfo(contractName){
            let path = `/contracts/${contractName}`;
            return this.send('GET', path, {}, undefined, (res, err) => {
                if (err) return;
                return res
            })
        }

        async getVariable(contract, variable, key = ''){
            let parms = {};
            if (validateTypes.isStringWithValue(key)) parms.key = key;

            let path = `/contracts/${contract}/${variable}/`;
            return this.send('GET', path, {parms}, undefined, (res, err) => {
                if (err) return null;
                try{
                    if (res.value) return res.value
                } catch (e){}
                return;
            })
        }

        async getContractMethods(contract){
            let path = `/contracts/${contract}/methods`;
            return this.send('GET', path, {}, undefined, (res, err) => {
                try{
                    if (res.methods) return res.methods
                } catch (e){}
                return [];
            })
            
        }

        async getContractVariables(contract){
            let path = `/contracts/${contract}/variables`;
            return this.send('GET', path, {}, undefined, (res, err) => {
                try{
                    if (res.variables) return res
                } catch (e){}
                return {};
            })
        }

        async pingServer(){
            return this.send('GET', '/ping', {}, undefined, (res, err) => {
                try { 
                    if (res.status === 'online') return true;
                } 
                catch (e) {
                    return false;
                }
            })
        }

        async getCurrencyBalance(vk){
            let balanceRes = await this.getVariable('currency', 'balances', vk);
            if (!balanceRes) return encoder_1('bigNumber', 0);
            if (balanceRes.__fixed__) return encoder_1('bigNumber', balanceRes.__fixed__)
            return encoder_1('bigNumber', balanceRes.toString());
        }

        async contractExists(contractName){
            let path = `/contracts/${contractName}`;
            return this.send('GET', path, {}, undefined, (res, err) => {
                try{
                    if (res.name) return true;
                } catch (e){}
                return false;
            })
        }

        async sendTransaction(data, url = undefined, callback){
            return this.send('POST', '/', JSON.stringify(data), url, (res, err) => {
                if (err){
                    if (callback) {
                        callback(undefined, err);
                        return;
                    } 
                    else return err
                }
                if (callback) {
                    callback(res, undefined);
                    return
                }
                return res;
            })   
        }

        async getNonce(sender, callback){
            if (!validateTypes.isStringHex(sender)) return `${sender} is not a hex string.`
            let path = `/nonce/${sender}`; 
            let url = this.host;
            return this.send('GET', path, {}, url, (res, err) => {
                if (err){
                    if (callback) {
                        callback(undefined, `Unable to get nonce for ${sender} on network ${url}`);
                        return
                    } 
                    return `Unable to get nonce for ${sender} on network ${url}`
                }
                res.masternode = url;
                if (callback) {
                    callback(res, undefined);
                    return
                }
                else return res;
            })
        }

        async checkTransaction(hash, callback){
            const parms = {hash};
            return this.send('GET', '/tx', {parms}, undefined, (res, err) => {
                if (err){
                    if (callback) {
                        callback(undefined, err);
                        return;
                    }
                    else return err
                }
                if (callback) {
                    callback(res, undefined);
                    return
                }
                return res;
            })  
        }
    }

    const { validateTypes: validateTypes$1 } = validators;

    class Network {
        // Constructor needs an Object with the following information to build Class.
        //
        // networkInfo: {
        //      hosts: <array> list of masternode hostname/ip urls,
        //      type: <string> "testnet", "mainnet" or "custom"
        //  },
        constructor(networkInfoObj){
            //Reject undefined or missing info
            if (!validateTypes$1.isObjectWithKeys(networkInfoObj)) throw new Error(`Expected Network Info Object and got Type: ${typeof networkInfoObj}`)
            if (!validateTypes$1.isArrayWithValues(networkInfoObj.hosts)) throw new Error(`HOSTS Required (Type: Array)`)

            this.type = validateTypes$1.isStringWithValue(networkInfoObj.type) ? networkInfoObj.type.toLowerCase() : "custom";
            this.events = new EventEmitter();
            this.hosts = this.validateHosts(networkInfoObj.hosts);
            this.currencySymbol = validateTypes$1.isStringWithValue(networkInfoObj.currencySymbol) ? networkInfoObj.currencySymbol : 'TAU';
            this.name = validateTypes$1.isStringWithValue(networkInfoObj.name) ? networkInfoObj.name : 'lamden network';
            this.lamden = validateTypes$1.isBoolean(networkInfoObj.lamden) ? networkInfoObj.lamden : false;
            this.blockExplorer = validateTypes$1.isStringWithValue(networkInfoObj.blockExplorer) ? networkInfoObj.blockExplorer : undefined;
        
            this.online = false;
            try{
                this.API = new LamdenMasterNode_API(networkInfoObj);
            } catch (e) {
                throw new Error(e)
            }
        }
        //This will throw an error if the protocol wasn't included in the host string
        vaidateProtocol(host){
            let protocols = ['https://', 'http://'];
            if (protocols.map(protocol => host.includes(protocol)).includes(true)) return host
            throw new Error('Host String must include http:// or https://')
        }
        validateHosts(hosts){
            return hosts.map(host => this.vaidateProtocol(host.toLowerCase()))
        }
        //Check if the network is online
        //Emits boolean as 'online' event
        //Also returns status as well as passes status to a callback
        async ping(callback = undefined){
            this.online = await this.API.pingServer();
            this.events.emit('online', this.online);
            if (validateTypes$1.isFunction(callback)) callback(this.online);
            return this.online
        }
        get host() {return this.hosts[Math.floor(Math.random() * this.hosts.length)]}
        get url() {return this.host}
        getNetworkInfo(){
            return {
                name: this.name,
                lamden: this.lamden,
                type: this.type,
                hosts: this.hosts,
                url: this.url,
                online: this.online,
            }
        }
    }

    const { validateTypes: validateTypes$2 } = validators;

    class TransactionBuilder extends Network {
        // Constructor needs an Object with the following information to build Class.
        //  
        // arg[0] (networkInfo): {  //Can also accpet a Lamden "Network Class"
        //      host: <string> masternode webserver hostname/ip,
        //      type: <string> "testnet", "mainnet" or "mockchain"
        //  }
        //  arg[1] (txInfo): {
        //      uid: [Optional] <string> unique ID for tracking purposes, 
        //      senderVk: <hex string> public key of the transaction sender,
        //      contractName: <string> name of lamden smart contract,
        //      methodName: <string> name of method to call in contractName,
        //      kwargs: <object> key/values of args to pass to methodName
        //              example: kwargs.to = "270add00fc708791c97aeb5255107c770434bd2ab71c2e103fbee75e202aa15e"
        //                       kwargs.amount = 1000
        //      stampLimit: <integer> the max amount of stamps the tx should use.  tx could use less. if tx needs more the tx will fail.
        //      nonce: [Optional] <integer> send() will attempt to retrieve this info automatically
        //      processor [Optional] <string> send() will attempt to retrieve this info automatically
        //  }
        //  arg[2] (txData): [Optional] state hydrating data
        constructor(networkInfo, txInfo, txData) {
            if (validateTypes$2.isSpecificClass(networkInfo, 'Network'))
                super(networkInfo.getNetworkInfo());
            else super(networkInfo);

            //Validate arguments
            if(!validateTypes$2.isObjectWithKeys(txInfo)) throw new Error(`txInfo object not found`)
            if(!validateTypes$2.isStringHex(txInfo.senderVk)) throw new Error(`Sender Public Key Required (Type: Hex String)`)
            if(!validateTypes$2.isStringWithValue(txInfo.contractName)) throw new Error(`Contract Name Required (Type: String)`)
            if(!validateTypes$2.isStringWithValue(txInfo.methodName)) throw new Error(`Method Required (Type: String)`)
            if(!validateTypes$2.isInteger(txInfo.stampLimit)) throw new Error(`Stamps Limit Required (Type: Integer)`)        

            //Store variables in self for reference
            this.uid = validateTypes$2.isStringWithValue(txInfo.uid) ? txInfo.uid : undefined;
            this.sender = txInfo.senderVk;
            this.contract = txInfo.contractName;
            this.method = txInfo.methodName;
            this.kwargs = {};
            if(validateTypes$2.isObject(txInfo.kwargs)) this.kwargs = txInfo.kwargs;
            this.stampLimit = txInfo.stampLimit;

            //validate and set nonce and processor if user provided them
            if (typeof txInfo.nonce !== 'undefined'){
                if(!validateTypes$2.isInteger(txInfo.nonce)) throw new Error(`arg[6] Nonce is required to be an Integer, type ${typeof txInfo.none} was given`)
                this.nonce = txInfo.nonce;
            }
            if (typeof txInfo.processor !== 'undefined'){
                if(!validateTypes$2.isStringWithValue(txInfo.processor)) throw new Error(`arg[7] Processor is required to be a String, type ${typeof txInfo.processor} was given`)
                this.processor = txInfo.processor;
            }
            
            this.signature;
            this.transactionSigned = false;

            //Transaction result information
            this.nonceResult = {};
            this.txSendResult = {errors:[]};
            this.txBlockResult = {};
            this.txHash;
            this.txCheckResult = {};
            this.txCheckAttempts = 0;
            this.txCheckLimit = 10;
            
            //Hydrate other items if passed
            if (txData){
                if (txData.uid) this.uid = txData.uid;
                if (validateTypes$2.isObjectWithKeys(txData.txSendResult)) this.txSendResult = txData.txSendResult;
                if (validateTypes$2.isObjectWithKeys(txData.nonceResult)){
                    this.nonceResult = txData.nonceResult;
                    if (validateTypes$2.isInteger(this.nonceResult.nonce)) this.nonce = this.nonceResult.nonce;
                    if (validateTypes$2.isStringWithValue(this.nonceResult.processor)) this.processor = this.nonceResult.processor;
                }
                if (validateTypes$2.isObjectWithKeys(txData.txSendResult)){
                    this.txSendResult = txData.txSendResult;
                    if (this.txSendResult.hash) this.txHash = this.txSendResult.hash;
                } 
                if (validateTypes$2.isObjectWithKeys(txData.txBlockResult)) this.txBlockResult = txData.txBlockResult;
                if (validateTypes$2.isObjectWithKeys(txData.resultInfo)) this.resultInfo = txData.resultInfo;
            }
            //Create Capnp messages and transactionMessages
            this.makePayload();
        }
        makePayload(){
            this.payload = {
                contract: this.contract,
                function: this.method,
                kwargs: this.kwargs,
                nonce: this.nonce,
                processor: this.processor,
                sender: this.sender,
                stamps_supplied: this.stampLimit
            };
            this.sortedPayload = this.sortObject(this.payload);
        }
        makeTransaction(){
            this.tx = {
                metadata: {
                    signature: this.signature,
                    timestamp: parseInt(+new Date / 1000),
                },
                payload: this.sortedPayload.orderedObj
            };
        }
        verifySignature(){
            //Verify the signature is correct
            if (!this.transactionSigned) throw new Error('Transaction has not be been signed. Use the sign(<private key>) method first.')
            const stringBuffer = Buffer.from(this.sortedPayload.json);
            const stringArray = new Uint8Array(stringBuffer);
            return verify(this.sender, stringArray, this.signature)
        }
        sign(sk){
            const stringBuffer = Buffer.from(this.sortedPayload.json);
            const stringArray = new Uint8Array(stringBuffer);
            this.signature = sign(sk, stringArray);
            this.transactionSigned = true;
        }
        sortObject(object){
            const processObj = (obj) => {
                const getType = (value) => {
                 return Object.prototype.toString.call(value)
                };
                const isArray = (value) => {
                 if(getType(value) === "[object Array]") return true;
                 return false;  
                };
                const isObject = (value) => {
                 if(getType(value) === "[object Object]") return true;
                 return false;  
                };
            
                const sortObjKeys = (unsorted) => {
                    const sorted = {};
                    Object.keys(unsorted).sort().forEach(key => sorted[key] = unsorted[key]);
                    return sorted
                };
            
                const formatKeys = (unformatted) => {
                    Object.keys(unformatted).forEach(key => {
                            if (isArray(unformatted[key])) unformatted[key] = unformatted[key].map(item => {
                            if (isObject(item)) return formatKeys(item)
                            return item
                        });
                        if (isObject(unformatted[key])) unformatted[key] = formatKeys(unformatted[key]);
                    });
                    return sortObjKeys(unformatted)
                };
            
                if (!isObject(obj)) throw new TypeError('Not a valid Object')
                    try{
                        obj = JSON.parse(JSON.stringify(obj));
                    } catch (e) {
                        throw new TypeError('Not a valid JSON Object')
                    }
                return formatKeys(obj)
            };
            const orderedObj = processObj(object);
            return { 
                orderedObj, 
                json: JSON.stringify(orderedObj)
            }
        }
        async getNonce(callback = undefined) {
            let timestamp =  new Date().toUTCString();
            this.nonceResult = await this.API.getNonce(this.sender);
            if (typeof this.nonceResult.nonce === 'undefined'){
                throw new Error(this.nonceResult)
            }
            this.nonceResult.timestamp = timestamp;
            this.nonce = this.nonceResult.nonce;
            this.processor = this.nonceResult.processor;
            this.nonceMasternode = this.nonceResult.masternode;
            //Create payload object
            this.makePayload();

            if (!callback) return this.nonceResult;
            return callback(this.nonceResult)
        }
        async send(sk = undefined, masternode = undefined, callback = undefined) {
            //Error if transaction is not signed and no sk provided to the send method to sign it before sending
            if (!validateTypes$2.isStringWithValue(sk) && !this.transactionSigned){
                throw new Error(`Transation Not Signed: Private key needed or call sign(<private key>) first`);
            }

            let timestamp =  new Date().toUTCString();

            try{
                //If the nonce isn't set attempt to get it
                if (isNaN(this.nonce) || !validateTypes$2.isStringWithValue(this.processor)) await this.getNonce();
                //if the sk is provided then sign the transaction
                if (validateTypes$2.isStringWithValue(sk)) this.sign(sk);
                //Serialize transaction
                this.makeTransaction();
                //Send transaction to the masternode
                let masternodeURL = masternode;
                if (!masternodeURL && this.nonceMasternode) masternodeURL = this.nonceMasternode;
                let response = await this.API.sendTransaction(this.tx, masternodeURL);
                //Set error if txSendResult doesn't exist
                if (response === 'undefined' || validateTypes$2.isStringWithValue(response)){
                    this.txSendResult.errors = ['TypeError: Failed to fetch'];
                }else {
                    if (response.error) this.txSendResult.errors = [response.error];
                    else this.txSendResult = response;
                }
            } catch (e){
                this.txSendResult.errors = [e.message];
            }
            this.txSendResult.timestamp = timestamp;
            return this.handleMasterNodeResponse(this.txSendResult, callback)
        }
        checkForTransactionResult(callback = undefined){
            return new Promise((resolve) => {
                let timerId = setTimeout(async function checkTx() {
                    this.txCheckAttempts = this.txCheckAttempts + 1;
                    const res = await this.API.checkTransaction(this.txHash);
                    let checkAgain = false;
                    const timestamp =  new Date().toUTCString();
                    if (typeof res === 'undefined'){
                        res = {};
                        res.error = 'TypeError: Failed to fetch';
                    }else {
                        if (typeof res === 'string') {
                            if (this.txCheckAttempts < this.txCheckLimit){
                                checkAgain = true;
                            }else {
                                this.txCheckResult.errors = [res];
                            }
                        }else {
                            if (res.error){
                                if (res.error === 'Transaction not found.'){
                                    if (this.txCheckAttempts < this.txCheckLimit){
                                        checkAgain = true;
                                    }else {
                                        this.txCheckResult.errors = [res.error, `Retry Attmpts ${this.txCheckAttempts} hit while checking for Tx Result.`];
                                    }
                                }else {
                                    this.txCheckResult.errors = [res.error];
                                }
                            }else {
                                this.txCheckResult = res;
                            }
                        }
                    }
                    if (checkAgain) timerId = setTimeout(checkTx.bind(this), 1000);
                    else {
                        if (validateTypes$2.isNumber(this.txCheckResult.status)){
                            if (this.txCheckResult.status > 0){
                                if (!validateTypes$2.isArray(this.txCheckResult.errors)) this.txCheckResult.errors = [];
                                this.txCheckResult.errors.push('This transaction returned a non-zero status code');
                            }
                        }
                        this.txCheckResult.timestamp = timestamp;
                        clearTimeout(timerId);
                        resolve(this.handleMasterNodeResponse(this.txCheckResult, callback));
                    }
                }.bind(this), 1000);
            })
        }
        handleMasterNodeResponse(result, callback = undefined){
            //Check to see if this is a successful transacation submission
            if (validateTypes$2.isStringWithValue(result.hash) && validateTypes$2.isStringWithValue(result.success)){
                this.txHash = result.hash;
                this.setPendingBlockInfo();
            }else {
                this.setBlockResultInfo(result);
                this.txBlockResult = result;
            }
            this.events.emit('response', result, this.resultInfo.subtitle);
            if (validateTypes$2.isFunction(callback)) callback(result);
            return result
        }
        setPendingBlockInfo(){
            this.resultInfo =  {
                title: 'Transaction Pending',
                subtitle: 'Your transaction was submitted and is being processed',
                message: `Tx Hash: ${this.txHash}`,
                type: 'success',
            };
            return this.resultInfo;
        }
        setBlockResultInfo(result){
            let erroredTx = false;
            let errorText = `returned an error and `;
            let statusCode = validateTypes$2.isNumber(result.status) ? result.status : undefined;
            let stamps = (result.stampsUsed || result.stamps_used) || 0;
            let message = '';
            if(validateTypes$2.isArrayWithValues(result.errors)){
                erroredTx = true;
                message = `This transaction returned ${result.errors.length} errors.`;
                if (result.result){
                    if (result.result.includes('AssertionError')) result.errors.push(result.result);
                }
            }
            if (statusCode && erroredTx) errorText = `returned status code ${statusCode} and `;
              
            this.resultInfo = {
                title: `Transaction ${erroredTx ? 'Failed' : 'Successful'}`,
                subtitle: `Your transaction ${erroredTx ? `${errorText} ` : ''}used ${stamps} stamps`,
                message,
                type: `${erroredTx ? 'error' : 'success'}`,
                errorInfo: erroredTx ? result.errors : undefined,
                returnResult: result.result || "",
                stampsUsed: stamps,
                statusCode
            };
            return this.resultInfo;
        }
        getResultInfo(){
            return this.resultInfo;
        }
        getTxInfo(){
            return {
                senderVk: this.sender,
                contractName: this.contract,
                methodName: this.method,
                kwargs: this.kwargs,
                stampLimit: this.stampLimit
            }
        }
        getAllInfo(){
            return {
                uid: this.uid,
                txHash: this.txHash,
                signed: this.transactionSigned,
                tx: this.tx,
                signature: this.signature,
                networkInfo: this.getNetworkInfo(),
                txInfo: this.getTxInfo(),
                txSendResult: this.txSendResult,
                txBlockResult: this.txBlockResult,
                resultInfo: this.getResultInfo(),
                nonceResult: this.nonceResult
            }
        }
    }

    const { validateTypes: validateTypes$3 } = validators;

    class TransactionBatcher extends Network {
        constructor(networkInfo) {
            if (validateTypes$3.isSpecificClass(networkInfo, 'Network'))
                super(networkInfo.getNetworkInfo());
            else super(networkInfo);

            this.txBatches = {};
            this.overflow = [];
            this.nonceResults = {};
            this.running = false;
        }
        addTransaction(txInfo){
            if (this.running) {
                this.overflow.push(txInfo);
                return
            }
            this.validateTransactionInfo(txInfo);
            if (!this.txBatches[txInfo.senderVk]) this.txBatches[txInfo.senderVk] = [];
            this.txBatches[txInfo.senderVk].push(txInfo);
        }
        addTransactionList(txList){
            txList.forEach(txInfo => this.addTransaction(txInfo));
        }
        processOverflow(){
            const overflow = this.overflow;
            this.overflow = [];
            overflow.forEach(txInfo => this.addTransaction(txInfo));
        }
        hasTransactions(){
            let test = Object.keys(this.txBatches).map(senderVk => this.txBatches[senderVk].length);
            test.filter(f => f === 0);
            if (test.length > 0 ) return true
            return false
        }
        validateTransactionInfo(txInfo){
            try{
                new TransactionBuilder(txInfo);
            }catch(e){
                return false
            }
            return true
        }
        async getStartingNonce(senderVk, callback = undefined){
            let timestamp =  new Date().toUTCString();
            let response = await this.API.getNonce(senderVk);
            if (typeof response.nonce === 'undefined'){
                throw new Error(response)
            }
            response.timestamp = timestamp;
            this.nonceResults[senderVk] = response;

            if (callback) callback(response);
            return response;
        }
        async sendAllBatches(keyDict){
            if (this.running) return
            let sentTransactions = [];
            this.running = true;
            
            await Promise.all(Object.keys(this.txBatches).map((senderVk) => {
                const senderBatch = this.txBatches[senderVk].splice(0,15);
                if (senderBatch.length <= 15) delete this.txBatches[senderVk];
                
                return new Promise(async (resolver) => {
                    if (senderBatch.length === 0 ) resolver();

                    if (!keyDict[senderVk]) throw new Error(`Cannot sign batch for ${senderVk}. No signing key provided.`)
                    let nonceResponse = await this.getStartingNonce(senderVk);
                    let txBatch = this.setBatchNonces(nonceResponse, senderBatch);
                    this.signBatch(txBatch, keyDict[senderVk]);
                    this.sendBatch(txBatch).then(sentList => {
                        sentTransactions = [...sentTransactions, ...sentList];
                        resolver();
                    });                
                })
            }));

            try{
                return Promise.all(sentTransactions)
            }catch (e){}
            finally{
                this.running = false;
                this.processOverflow();
            }
        }
        setBatchNonces(nonceResult, txList){
            return txList.map((txInfo, index) => {
                txInfo.nonce = nonceResult.nonce + index;
                txInfo.processor = nonceResult.processor;
                return new TransactionBuilder({hosts: [nonceResult.masternode]}, txInfo)
            }).sort((a, b) => a.nonce - b.nonce)
        }
        signBatch(txBatch, key){
            txBatch.forEach(txBuilder => txBuilder.sign(key));
        }
        sendBatch(txBatch){
            let resolvedTransactions = [];
            return new Promise(resolver => {
                const resolve = (index) => {
                    if ((index + 1) === txBatch.length) resolver(resolvedTransactions);
                };
                txBatch.forEach((txBuilder, index) => {
                    const delayedSend = () => {
                        resolvedTransactions[index] = txBuilder.send().then(() => {return txBuilder});
                        resolve(index);
                    };
                    setTimeout(delayedSend, 1200 * index);
                });
            })
        }
    }

    var index = {
        TransactionBuilder,
        TransactionBatcher,
        Masternode_API: LamdenMasterNode_API,
        Network,
        wallet,
        Encoder: encoder_1
    };

    module.exports = index;
    });

    var Lamden = /*@__PURE__*/getDefaultExportFromCjs(lamden);

    /* src\Login.svelte generated by Svelte v3.31.2 */

    const file = "src\\Login.svelte";

    function create_fragment(ctx) {
    	let div9;
    	let div8;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div7;
    	let div5;
    	let div2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div4;
    	let h3;
    	let t5;
    	let div3;
    	let p;
    	let t7;
    	let div6;
    	let button0;
    	let t9;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Welcome to My Lamden Wallet";
    			t5 = space();
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "Please unlock your wallet, or alternatively create a new wallet to begin.";
    			t7 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Unlock Existing Wallet";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Create New Wallet";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file, 16, 8, 596);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file, 15, 6, 521);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file, 19, 6, 681);
    			if (img.src !== (img_src_value = "image/lamden.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 24, 12, 1163);
    			attr_dev(div2, "class", "mx-auto flex items-center justify-center w-12 h-12");
    			add_location(div2, file, 23, 10, 1085);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file, 27, 12, 1273);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file, 31, 14, 1459);
    			attr_dev(div3, "class", "mt-2");
    			add_location(div3, file, 30, 12, 1425);
    			attr_dev(div4, "class", "mt-3 text-center sm:mt-5");
    			add_location(div4, file, 26, 10, 1221);
    			add_location(div5, file, 22, 8, 1068);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file, 38, 10, 1760);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file, 41, 10, 2147);
    			attr_dev(div6, "class", "mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense");
    			add_location(div6, file, 37, 8, 1667);
    			attr_dev(div7, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-modal", "true");
    			attr_dev(div7, "aria-labelledby", "modal-headline");
    			attr_dev(div7, "id", "login1");
    			add_location(div7, file, 21, 6, 793);
    			attr_dev(div8, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div8, file, 4, 4, 125);
    			attr_dev(div9, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div9, "id", "login-main");
    			add_location(div9, file, 3, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div8, t0);
    			append_dev(div8, span);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, h3);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t9);
    			append_dev(div6, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "submit", btnExistingWallet, false, false, false),
    					listen_dev(button1, "submit", btnCreateWallet, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Login", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var byteLength_1 = byteLength;
    var toByteArray_1 = toByteArray;
    var fromByteArray_1 = fromByteArray;

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    // Support decoding URL-safe base64 strings, as Node.js does.
    // See: https://en.wikipedia.org/wiki/Base64#URL_applications
    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;

    function getLens (b64) {
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // Trim off extra bytes after placeholder bytes are found
      // See: https://github.com/beatgammit/base64-js/issues/42
      var validLen = b64.indexOf('=');
      if (validLen === -1) validLen = len;

      var placeHoldersLen = validLen === len
        ? 0
        : 4 - (validLen % 4);

      return [validLen, placeHoldersLen]
    }

    // base64 is 4/3 + up to two characters of the original data
    function byteLength (b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }

    function _byteLength (b64, validLen, placeHoldersLen) {
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }

    function toByteArray (b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];

      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

      var curByte = 0;

      // if there are placeholders, only get up to the last complete 4 chars
      var len = placeHoldersLen > 0
        ? validLen - 4
        : validLen;

      var i;
      for (i = 0; i < len; i += 4) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 18) |
          (revLookup[b64.charCodeAt(i + 1)] << 12) |
          (revLookup[b64.charCodeAt(i + 2)] << 6) |
          revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = (tmp >> 16) & 0xFF;
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF;
      }

      if (placeHoldersLen === 2) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 2) |
          (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[curByte++] = tmp & 0xFF;
      }

      if (placeHoldersLen === 1) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 10) |
          (revLookup[b64.charCodeAt(i + 1)] << 4) |
          (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] +
        lookup[num >> 12 & 0x3F] +
        lookup[num >> 6 & 0x3F] +
        lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp =
          ((uint8[i] << 16) & 0xFF0000) +
          ((uint8[i + 1] << 8) & 0xFF00) +
          (uint8[i + 2] & 0xFF);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        parts.push(
          lookup[tmp >> 2] +
          lookup[(tmp << 4) & 0x3F] +
          '=='
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(
          lookup[tmp >> 10] +
          lookup[(tmp >> 4) & 0x3F] +
          lookup[(tmp << 2) & 0x3F] +
          '='
        );
      }

      return parts.join('')
    }

    var base64Js = {
    	byteLength: byteLength_1,
    	toByteArray: toByteArray_1,
    	fromByteArray: fromByteArray_1
    };

    /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
    var read = function (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = (nBytes * 8) - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    };

    var write = function (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = (nBytes * 8) - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = ((value * c) - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    };

    var ieee754 = {
    	read: read,
    	write: write
    };

    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     */

    var buffer = createCommonjsModule(function (module, exports) {



    const customInspectSymbol =
      (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
        ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
        : null;

    exports.Buffer = Buffer;
    exports.SlowBuffer = SlowBuffer;
    exports.INSPECT_MAX_BYTES = 50;

    const K_MAX_LENGTH = 0x7fffffff;
    exports.kMaxLength = K_MAX_LENGTH;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Print warning and recommend using `buffer` v4.x which has an Object
     *               implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * We report that the browser does not support typed arrays if the are not subclassable
     * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
     * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
     * for __proto__ and has a buggy typed array implementation.
     */
    Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

    if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
        typeof console.error === 'function') {
      console.error(
        'This browser lacks typed array (Uint8Array) support which is required by ' +
        '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
      );
    }

    function typedArraySupport () {
      // Can typed array instances can be augmented?
      try {
        const arr = new Uint8Array(1);
        const proto = { foo: function () { return 42 } };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42
      } catch (e) {
        return false
      }
    }

    Object.defineProperty(Buffer.prototype, 'parent', {
      enumerable: true,
      get: function () {
        if (!Buffer.isBuffer(this)) return undefined
        return this.buffer
      }
    });

    Object.defineProperty(Buffer.prototype, 'offset', {
      enumerable: true,
      get: function () {
        if (!Buffer.isBuffer(this)) return undefined
        return this.byteOffset
      }
    });

    function createBuffer (length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"')
      }
      // Return an augmented `Uint8Array` instance
      const buf = new Uint8Array(length);
      Object.setPrototypeOf(buf, Buffer.prototype);
      return buf
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          )
        }
        return allocUnsafe(arg)
      }
      return from(arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    function from (value, encodingOrOffset, length) {
      if (typeof value === 'string') {
        return fromString(value, encodingOrOffset)
      }

      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value)
      }

      if (value == null) {
        throw new TypeError(
          'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
          'or Array-like Object. Received type ' + (typeof value)
        )
      }

      if (isInstance(value, ArrayBuffer) ||
          (value && isInstance(value.buffer, ArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length)
      }

      if (typeof SharedArrayBuffer !== 'undefined' &&
          (isInstance(value, SharedArrayBuffer) ||
          (value && isInstance(value.buffer, SharedArrayBuffer)))) {
        return fromArrayBuffer(value, encodingOrOffset, length)
      }

      if (typeof value === 'number') {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        )
      }

      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer.from(valueOf, encodingOrOffset, length)
      }

      const b = fromObject(value);
      if (b) return b

      if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
          typeof value[Symbol.toPrimitive] === 'function') {
        return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
      }

      throw new TypeError(
        'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
        'or Array-like Object. Received type ' + (typeof value)
      )
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length)
    };

    // Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
    // https://github.com/feross/buffer/pull/148
    Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer, Uint8Array);

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be of type number')
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"')
      }
    }

    function alloc (size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpreted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(size).fill(fill, encoding)
          : createBuffer(size).fill(fill)
      }
      return createBuffer(size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(size, fill, encoding)
    };

    function allocUnsafe (size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0)
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(size)
    };

    function fromString (string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding)
      }

      const length = byteLength(string, encoding) | 0;
      let buf = createBuffer(length);

      const actual = buf.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual);
      }

      return buf
    }

    function fromArrayLike (array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf = createBuffer(length);
      for (let i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255;
      }
      return buf
    }

    function fromArrayView (arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
      }
      return fromArrayLike(arrayView)
    }

    function fromArrayBuffer (array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds')
      }

      let buf;
      if (byteOffset === undefined && length === undefined) {
        buf = new Uint8Array(array);
      } else if (length === undefined) {
        buf = new Uint8Array(array, byteOffset);
      } else {
        buf = new Uint8Array(array, byteOffset, length);
      }

      // Return an augmented `Uint8Array` instance
      Object.setPrototypeOf(buf, Buffer.prototype);

      return buf
    }

    function fromObject (obj) {
      if (Buffer.isBuffer(obj)) {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);

        if (buf.length === 0) {
          return buf
        }

        obj.copy(buf, 0, 0, len);
        return buf
      }

      if (obj.length !== undefined) {
        if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
          return createBuffer(0)
        }
        return fromArrayLike(obj)
      }

      if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data)
      }
    }

    function checked (length) {
      // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= K_MAX_LENGTH) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
      }
      return length | 0
    }

    function SlowBuffer (length) {
      if (+length != length) { // eslint-disable-line eqeqeq
        length = 0;
      }
      return Buffer.alloc(+length)
    }

    Buffer.isBuffer = function isBuffer (b) {
      return b != null && b._isBuffer === true &&
        b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
    };

    Buffer.compare = function compare (a, b) {
      if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
      if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
      if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        )
      }

      if (a === b) return 0

      let x = a.length;
      let y = b.length;

      for (let i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      let i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      const buffer = Buffer.allocUnsafe(length);
      let pos = 0;
      for (i = 0; i < list.length; ++i) {
        let buf = list[i];
        if (isInstance(buf, Uint8Array)) {
          if (pos + buf.length > buffer.length) {
            if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
            buf.copy(buffer, pos);
          } else {
            Uint8Array.prototype.set.call(
              buffer,
              buf,
              pos
            );
          }
        } else if (!Buffer.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        } else {
          buf.copy(buffer, pos);
        }
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (Buffer.isBuffer(string)) {
        return string.length
      }
      if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
          'Received type ' + typeof string
        )
      }

      const len = string.length;
      const mustMatch = (arguments.length > 2 && arguments[2] === true);
      if (!mustMatch && len === 0) return 0

      // Use a for loop to avoid recursion
      let loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
            }
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      let loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
    // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
    // reliably in a browserify context because there could be multiple different
    // copies of the 'buffer' package in use. This method works even for Buffer
    // instances that were created from another copy of the `buffer` package.
    // See: https://github.com/feross/buffer/issues/154
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      const i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      const len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (let i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      const len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (let i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      const len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (let i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      const length = this.length;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.toLocaleString = Buffer.prototype.toString;

    Buffer.prototype.equals = function equals (b) {
      if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      let str = '';
      const max = exports.INSPECT_MAX_BYTES;
      str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
      if (this.length > max) str += ' ... ';
      return '<Buffer ' + str + '>'
    };
    if (customInspectSymbol) {
      Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
    }

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer.from(target, target.offset, target.byteLength);
      }
      if (!Buffer.isBuffer(target)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. ' +
          'Received type ' + (typeof target)
        )
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      let x = thisEnd - thisStart;
      let y = end - start;
      const len = Math.min(x, y);

      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);

      for (let i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset; // Coerce to Number.
      if (numberIsNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (Buffer.isBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      let i;
      if (dir) {
        let foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          let found = true;
          for (let j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      const remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      const strLen = string.length;

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      let i;
      for (i = 0; i < length; ++i) {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
          length = length >>> 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      const remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      let loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
          case 'latin1':
          case 'binary':
            return asciiWrite(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64Js.fromByteArray(buf)
      } else {
        return base64Js.fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      const res = [];

      let i = start;
      while (i < end) {
        const firstByte = buf[i];
        let codePoint = null;
        let bytesPerSequence = (firstByte > 0xEF)
          ? 4
          : (firstByte > 0xDF)
              ? 3
              : (firstByte > 0xBF)
                  ? 2
                  : 1;

        if (i + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    const MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      let res = '';
      let i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      let ret = '';
      end = Math.min(buf.length, end);

      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      let ret = '';
      end = Math.min(buf.length, end);

      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      const len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      let out = '';
      for (let i = start; i < end; ++i) {
        out += hexSliceLookupTable[buf[i]];
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      const bytes = buf.slice(start, end);
      let res = '';
      // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
      for (let i = 0; i < bytes.length - 1; i += 2) {
        res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      const len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      const newBuf = this.subarray(start, end);
      // Return an augmented `Uint8Array` instance
      Object.setPrototypeOf(newBuf, Buffer.prototype);

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUintLE =
    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUintBE =
    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      let val = this[offset + --byteLength];
      let mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUint8 =
    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUint16LE =
    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUint16BE =
    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUint32LE =
    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUint32BE =
    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
      offset = offset >>> 0;
      validateNumber(offset, 'offset');
      const first = this[offset];
      const last = this[offset + 7];
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8);
      }

      const lo = first +
        this[++offset] * 2 ** 8 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 24;

      const hi = this[++offset] +
        this[++offset] * 2 ** 8 +
        this[++offset] * 2 ** 16 +
        last * 2 ** 24;

      return BigInt(lo) + (BigInt(hi) << BigInt(32))
    });

    Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
      offset = offset >>> 0;
      validateNumber(offset, 'offset');
      const first = this[offset];
      const last = this[offset + 7];
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8);
      }

      const hi = first * 2 ** 24 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        this[++offset];

      const lo = this[++offset] * 2 ** 24 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        last;

      return (BigInt(hi) << BigInt(32)) + BigInt(lo)
    });

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      let i = byteLength;
      let mul = 1;
      let val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
      offset = offset >>> 0;
      validateNumber(offset, 'offset');
      const first = this[offset];
      const last = this[offset + 7];
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8);
      }

      const val = this[offset + 4] +
        this[offset + 5] * 2 ** 8 +
        this[offset + 6] * 2 ** 16 +
        (last << 24); // Overflow

      return (BigInt(val) << BigInt(32)) +
        BigInt(first +
        this[++offset] * 2 ** 8 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 24)
    });

    Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
      offset = offset >>> 0;
      validateNumber(offset, 'offset');
      const first = this[offset];
      const last = this[offset + 7];
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8);
      }

      const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        this[++offset];

      return (BigInt(val) << BigInt(32)) +
        BigInt(this[++offset] * 2 ** 24 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        last)
    });

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUintLE =
    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      let mul = 1;
      let i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUintBE =
    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength = byteLength >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      let i = byteLength - 1;
      let mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUint8 =
    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeUint16LE =
    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      return offset + 2
    };

    Buffer.prototype.writeUint16BE =
    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
      return offset + 2
    };

    Buffer.prototype.writeUint32LE =
    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      this[offset + 3] = (value >>> 24);
      this[offset + 2] = (value >>> 16);
      this[offset + 1] = (value >>> 8);
      this[offset] = (value & 0xff);
      return offset + 4
    };

    Buffer.prototype.writeUint32BE =
    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
      return offset + 4
    };

    function wrtBigUInt64LE (buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);

      let lo = Number(value & BigInt(0xffffffff));
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      return offset
    }

    function wrtBigUInt64BE (buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);

      let lo = Number(value & BigInt(0xffffffff));
      buf[offset + 7] = lo;
      lo = lo >> 8;
      buf[offset + 6] = lo;
      lo = lo >> 8;
      buf[offset + 5] = lo;
      lo = lo >> 8;
      buf[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
      buf[offset + 3] = hi;
      hi = hi >> 8;
      buf[offset + 2] = hi;
      hi = hi >> 8;
      buf[offset + 1] = hi;
      hi = hi >> 8;
      buf[offset] = hi;
      return offset + 8
    }

    Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    });

    Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    });

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, (8 * byteLength) - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      let i = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, (8 * byteLength) - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      let i = byteLength - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      this[offset + 2] = (value >>> 16);
      this[offset + 3] = (value >>> 24);
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
      return offset + 4
    };

    Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    });

    Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    });

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      ieee754.write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      ieee754.write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      const len = end - start;

      if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
        // Use built-in when available, missing from IE11
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
        if (val.length === 1) {
          const code = val.charCodeAt(0);
          if ((encoding === 'utf8' && code < 128) ||
              encoding === 'latin1') {
            // Fast path: If `val` fits into a single byte, use that numeric value.
            val = code;
          }
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      } else if (typeof val === 'boolean') {
        val = Number(val);
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      let i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        const bytes = Buffer.isBuffer(val)
          ? val
          : Buffer.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
          throw new TypeError('The value "' + val +
            '" is invalid for argument "value"')
        }
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // CUSTOM ERRORS
    // =============

    // Simplified versions from Node, changed for Buffer-only usage
    const errors = {};
    function E (sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor () {
          super();

          Object.defineProperty(this, 'message', {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });

          // Add the error code to the name to include it in the stack trace.
          this.name = `${this.name} [${sym}]`;
          // Access the stack to generate the error message including the error code
          // from the name.
          this.stack; // eslint-disable-line no-unused-expressions
          // Reset the name to the actual name.
          delete this.name;
        }

        get code () {
          return sym
        }

        set code (value) {
          Object.defineProperty(this, 'code', {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }

        toString () {
          return `${this.name} [${sym}]: ${this.message}`
        }
      };
    }

    E('ERR_BUFFER_OUT_OF_BOUNDS',
      function (name) {
        if (name) {
          return `${name} is outside of buffer bounds`
        }

        return 'Attempt to access memory outside buffer bounds'
      }, RangeError);
    E('ERR_INVALID_ARG_TYPE',
      function (name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`
      }, TypeError);
    E('ERR_OUT_OF_RANGE',
      function (str, range, input) {
        let msg = `The value of "${str}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === 'bigint') {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += 'n';
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg
      }, RangeError);

    function addNumericalSeparator (val) {
      let res = '';
      let i = val.length;
      const start = val[0] === '-' ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`
    }

    // CHECK FUNCTIONS
    // ===============

    function checkBounds (buf, offset, byteLength) {
      validateNumber(offset, 'offset');
      if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
        boundsError(offset, buf.length - (byteLength + 1));
      }
    }

    function checkIntBI (value, min, max, buf, offset, byteLength) {
      if (value > max || value < min) {
        const n = typeof min === 'bigint' ? 'n' : '';
        let range;
        if (byteLength > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
          } else {
            range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                    `${(byteLength + 1) * 8 - 1}${n}`;
          }
        } else {
          range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new errors.ERR_OUT_OF_RANGE('value', range, value)
      }
      checkBounds(buf, offset, byteLength);
    }

    function validateNumber (value, name) {
      if (typeof value !== 'number') {
        throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
      }
    }

    function boundsError (value, length, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
      }

      if (length < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
      }

      throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                        `>= ${type ? 1 : 0} and <= ${length}`,
                                        value)
    }

    // HELPER FUNCTIONS
    // ================

    const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node takes equal signs as end of the Base64 encoding
      str = str.split('=')[0];
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = str.trim().replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      let codePoint;
      const length = string.length;
      let leadSurrogate = null;
      const bytes = [];

      for (let i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      let c, hi, lo;
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }

    function base64ToBytes (str) {
      return base64Js.toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      let i;
      for (i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
    // the `instanceof` check but they should be treated as of that type.
    // See: https://github.com/feross/buffer/issues/166
    function isInstance (obj, type) {
      return obj instanceof type ||
        (obj != null && obj.constructor != null && obj.constructor.name != null &&
          obj.constructor.name === type.name)
    }
    function numberIsNaN (obj) {
      // For IE11 support
      return obj !== obj // eslint-disable-line no-self-compare
    }

    // Create lookup table for `toString('hex')`
    // See: https://github.com/feross/buffer/issues/219
    const hexSliceLookupTable = (function () {
      const alphabet = '0123456789abcdef';
      const table = new Array(256);
      for (let i = 0; i < 16; ++i) {
        const i16 = i * 16;
        for (let j = 0; j < 16; ++j) {
          table[i16 + j] = alphabet[i] + alphabet[j];
        }
      }
      return table
    })();

    // Return not function with Error if BigInt not supported
    function defineBigIntMethod (fn) {
      return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
    }

    function BufferBigIntNotDefined () {
      throw new Error('BigInt not supported')
    }
    });

    /* src\App.svelte generated by Svelte v3.31.2 */

    const { console: console_1, document: document_1 } = globals;
    const file$1 = "src\\App.svelte";

    // (496:31) {#if istestnet}
    function create_if_block_15(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("d");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(496:31) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (579:31) {#if istestnet}
    function create_if_block_14(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("d");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(579:31) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (626:10) {:else}
    function create_else_block(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let svg;
    	let path;
    	let t0;
    	let div1;
    	let p0;
    	let t2;
    	let p1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "You are running an early build of My Lamden Wallet. Additional Features are coming soon. Please report any instabilities: luke@ideaengine.com.au.";
    			t2 = space();
    			p1 = element("p");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z");
    			attr_dev(path, "clip-rule", "evenodd");
    			add_location(path, file$1, 631, 18, 23828);
    			attr_dev(svg, "class", "h-5 w-5 text-blue-400");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "aria-hidden", "true");
    			add_location(svg, file$1, 630, 16, 23680);
    			attr_dev(div0, "class", "flex-shrink-0");
    			add_location(div0, file$1, 628, 14, 23577);
    			attr_dev(p0, "class", "text-sm text-grey-700");
    			add_location(p0, file$1, 638, 16, 24149);
    			attr_dev(p1, "class", "mt-3 text-sm md:mt-0 md:ml-6");
    			add_location(p1, file$1, 641, 16, 24384);
    			attr_dev(div1, "class", "ml-3 flex-1 md:flex md:justify-between");
    			add_location(div1, file$1, 637, 14, 24080);
    			attr_dev(div2, "class", "flex");
    			add_location(div2, file$1, 627, 12, 23544);
    			attr_dev(div3, "class", "rounded-md bg-blue-50 p-4");
    			add_location(div3, file$1, 626, 10, 23492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t2);
    			append_dev(div1, p1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(626:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (604:10) {#if istestnet}
    function create_if_block_13(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let svg;
    	let path;
    	let t0;
    	let div1;
    	let p0;
    	let t2;
    	let p1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "You are running on TESTNET. Transactions are in dTAU. Transactions will not show in block explorer.";
    			t2 = space();
    			p1 = element("p");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z");
    			attr_dev(path, "clip-rule", "evenodd");
    			add_location(path, file$1, 608, 18, 22821);
    			attr_dev(svg, "class", "h-5 w-5 text-red-400");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "aria-hidden", "true");
    			add_location(svg, file$1, 607, 16, 22674);
    			attr_dev(div0, "class", "flex-shrink-0");
    			add_location(div0, file$1, 605, 14, 22571);
    			attr_dev(p0, "class", "text-sm text-brown-700");
    			add_location(p0, file$1, 615, 16, 23142);
    			attr_dev(p1, "class", "mt-3 text-sm md:mt-0 md:ml-6");
    			add_location(p1, file$1, 618, 16, 23332);
    			attr_dev(div1, "class", "ml-3 flex-1 md:flex md:justify-between");
    			add_location(div1, file$1, 614, 14, 23073);
    			attr_dev(div2, "class", "flex");
    			add_location(div2, file$1, 604, 12, 22538);
    			attr_dev(div3, "class", "rounded-md bg-red-50 p-4");
    			add_location(div3, file$1, 603, 33, 22487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t2);
    			append_dev(div1, p1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(604:10) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (652:29) {#if istestnet}
    function create_if_block_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("d");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(652:29) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (700:0) {#if PageLogin}
    function create_if_block_11(ctx) {
    	let div10;
    	let div9;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div8;
    	let div5;
    	let div2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div4;
    	let h3;
    	let t5;
    	let div3;
    	let p;
    	let t7;
    	let div6;
    	let button0;
    	let t9;
    	let button1;
    	let t11;
    	let hr;
    	let t12;
    	let div7;
    	let i;
    	let t13;
    	let a0;
    	let t15;
    	let a1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			div9 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div8 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Welcome to My Lamden Wallet";
    			t5 = space();
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "Please unlock your wallet, or alternatively create a new wallet to begin.";
    			t7 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Unlock Existing Wallet";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Create New Wallet";
    			t11 = space();
    			hr = element("hr");
    			t12 = space();
    			div7 = element("div");
    			i = element("i");
    			t13 = text("Alternatively, use wallet in Testnet Mode: ");
    			a0 = element("a");
    			a0.textContent = "Unlock";
    			t15 = text(" | ");
    			a1 = element("a");
    			a1.textContent = "New";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 715, 8, 27304);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 714, 6, 27230);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 718, 6, 27386);
    			if (img.src !== (img_src_value = "image/lamden.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "lamden");
    			add_location(img, file$1, 723, 12, 27863);
    			attr_dev(div2, "class", "mx-auto flex items-center justify-center w-12 h-12");
    			add_location(div2, file$1, 722, 10, 27786);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 726, 12, 27983);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file$1, 730, 14, 28165);
    			attr_dev(div3, "class", "mt-2");
    			add_location(div3, file$1, 729, 12, 28132);
    			attr_dev(div4, "class", "mt-3 text-center sm:mt-5");
    			add_location(div4, file$1, 725, 10, 27932);
    			add_location(div5, file$1, 721, 8, 27770);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 737, 10, 28459);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 740, 10, 28842);
    			attr_dev(div6, "class", "mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense");
    			add_location(div6, file$1, 736, 8, 28367);
    			set_style(hr, "margin", "20px");
    			add_location(hr, file$1, 744, 8, 29236);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$1, 746, 131, 29419);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$1, 746, 187, 29475);
    			set_style(i, "font-size", "70%");
    			set_style(i, "text-align", "center");
    			set_style(i, "margin", "0 auto");
    			set_style(i, "float", "middle");
    			set_style(i, "width", "auto");
    			add_location(i, file$1, 746, 7, 29295);
    			set_style(div7, "width", "100%");
    			add_location(div7, file$1, 745, 0, 29262);
    			attr_dev(div8, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div8, "role", "dialog");
    			attr_dev(div8, "aria-modal", "true");
    			attr_dev(div8, "aria-labelledby", "modal-headline");
    			attr_dev(div8, "id", "login1");
    			add_location(div8, file$1, 720, 6, 27496);
    			attr_dev(div9, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div9, file$1, 703, 4, 26845);
    			attr_dev(div10, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div10, "id", "login-main");
    			add_location(div10, file$1, 702, 0, 26776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div9);
    			append_dev(div9, div1);
    			append_dev(div1, div0);
    			append_dev(div9, t0);
    			append_dev(div9, span);
    			append_dev(div9, t2);
    			append_dev(div9, div8);
    			append_dev(div8, div5);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, h3);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p);
    			append_dev(div8, t7);
    			append_dev(div8, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t9);
    			append_dev(div6, button1);
    			append_dev(div8, t11);
    			append_dev(div8, hr);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div7, i);
    			append_dev(i, t13);
    			append_dev(i, a0);
    			append_dev(i, t15);
    			append_dev(i, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*btnExistingWallet*/ ctx[21], false, false, false),
    					listen_dev(button1, "click", /*btnCreateWallet*/ ctx[23], false, false, false),
    					listen_dev(a0, "click", /*btnExistingWalletTN*/ ctx[22], false, false, false),
    					listen_dev(a1, "click", /*btnCreateWalletTN*/ ctx[24], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(700:0) {#if PageLogin}",
    		ctx
    	});

    	return block;
    }

    // (754:2) {#if PageLoginNew}
    function create_if_block_10(ctx) {
    	let div9;
    	let div8;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div7;
    	let div5;
    	let div2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div4;
    	let h3;
    	let t5;
    	let div3;
    	let p0;
    	let t7;
    	let p1;
    	let p2;
    	let t8;
    	let t9;
    	let div6;
    	let button0;
    	let t11;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Please write down these 24 words down.";
    			t5 = space();
    			div3 = element("div");
    			p0 = element("p");
    			p0.textContent = "Write these words down physically, and store them in a secure place. These will be used to restore your wallet at anytime.";
    			t7 = space();
    			p1 = element("p");
    			p2 = element("p");
    			t8 = text(/*humanwords*/ ctx[4]);
    			t9 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Next";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 767, 8, 30154);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 766, 6, 30080);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 770, 6, 30236);
    			if (img.src !== (img_src_value = "image/lamden.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Lamden Logo");
    			add_location(img, file$1, 775, 12, 30713);
    			attr_dev(div2, "class", "mx-auto flex items-center justify-center w-12 h-12");
    			add_location(div2, file$1, 774, 10, 30636);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 778, 12, 30838);
    			attr_dev(p0, "class", "text-sm text-gray-500");
    			add_location(p0, file$1, 782, 14, 31035);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file$1, 783, 163, 31232);
    			add_location(p2, file$1, 784, 8, 31274);
    			attr_dev(div3, "class", "mt-2");
    			add_location(div3, file$1, 781, 12, 31002);
    			attr_dev(div4, "class", "mt-3 text-center sm:mt-5");
    			add_location(div4, file$1, 777, 10, 30787);
    			add_location(div5, file$1, 773, 8, 30620);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "id", "completebtn");
    			attr_dev(button0, "class", "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 791, 10, 31395);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 794, 10, 31776);
    			attr_dev(div6, "class", "");
    			add_location(div6, file$1, 788, 8, 31359);
    			attr_dev(div7, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-modal", "true");
    			attr_dev(div7, "aria-labelledby", "modal-headline");
    			attr_dev(div7, "id", "login1");
    			add_location(div7, file$1, 772, 6, 30346);
    			attr_dev(div8, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div8, file$1, 755, 4, 29695);
    			attr_dev(div9, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div9, "id", "login-new");
    			add_location(div9, file$1, 754, 2, 29627);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div8, t0);
    			append_dev(div8, span);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, h3);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p0);
    			append_dev(div3, t7);
    			append_dev(div3, p1);
    			append_dev(div3, p2);
    			append_dev(p2, t8);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t11);
    			append_dev(div6, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*btnConfirmWords*/ ctx[33], false, false, false),
    					listen_dev(button1, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*humanwords*/ 16) set_data_dev(t8, /*humanwords*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(754:2) {#if PageLoginNew}",
    		ctx
    	});

    	return block;
    }

    // (803:0) {#if PageLoginNew2}
    function create_if_block_9(ctx) {
    	let div9;
    	let div8;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div7;
    	let div5;
    	let div2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div4;
    	let h3;
    	let t5;
    	let div3;
    	let p;
    	let t7;
    	let div6;
    	let input;
    	let t8;
    	let button0;
    	let t10;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Please enter your 24 words to confirm.";
    			t5 = space();
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "The Next button will unlock once the words have been entered correctly. If it does not unlock, please regenerate your words by reloading the page.";
    			t7 = space();
    			div6 = element("div");
    			input = element("input");
    			t8 = space();
    			button0 = element("button");
    			button0.textContent = "Next";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 816, 8, 32736);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 815, 6, 32662);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 819, 6, 32818);
    			if (img.src !== (img_src_value = "image/lamden.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Lamden Logo");
    			add_location(img, file$1, 824, 12, 33295);
    			attr_dev(div2, "class", "mx-auto flex items-center justify-center w-12 h-12");
    			add_location(div2, file$1, 823, 10, 33218);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 827, 12, 33420);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file$1, 831, 14, 33629);
    			attr_dev(div3, "class", "mt-2");
    			add_location(div3, file$1, 830, 12, 33596);
    			attr_dev(div4, "class", "mt-3 text-center sm:mt-5");
    			add_location(div4, file$1, 826, 10, 33369);
    			add_location(div5, file$1, 822, 8, 33202);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "words24");
    			attr_dev(input, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input, file$1, 837, 10, 33911);
    			button0.disabled = true;
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "id", "completebtnwords");
    			attr_dev(button0, "class", "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 838, 10, 34029);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 841, 10, 34427);
    			attr_dev(div6, "class", "");
    			add_location(div6, file$1, 836, 8, 33886);
    			attr_dev(div7, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-modal", "true");
    			attr_dev(div7, "aria-labelledby", "modal-headline");
    			attr_dev(div7, "id", "login1");
    			add_location(div7, file$1, 821, 6, 32928);
    			attr_dev(div8, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div8, file$1, 804, 4, 32277);
    			attr_dev(div9, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div9, "id", "login-new");
    			add_location(div9, file$1, 803, 2, 32209);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div8, t0);
    			append_dev(div8, span);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, h3);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, input);
    			append_dev(div6, t8);
    			append_dev(div6, button0);
    			append_dev(div6, t10);
    			append_dev(div6, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*wordscheck*/ ctx[38], false, false, false),
    					listen_dev(button0, "click", /*btnCreateWalletNext*/ ctx[27], false, false, false),
    					listen_dev(button1, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(803:0) {#if PageLoginNew2}",
    		ctx
    	});

    	return block;
    }

    // (850:2) {#if PageLoginExisting}
    function create_if_block_8(ctx) {
    	let div9;
    	let div8;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div7;
    	let div5;
    	let div2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div4;
    	let h3;
    	let t5;
    	let div3;
    	let p;
    	let t7;
    	let div6;
    	let button0;
    	let t9;
    	let button1;
    	let t11;
    	let button2;
    	let t13;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Login with an Existing Wallet.";
    			t5 = space();
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "Please select what format your wallet is stored in.";
    			t7 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Keystore File (Coming Soon)";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "24 Words";
    			t11 = space();
    			button2 = element("button");
    			button2.textContent = "Private Key";
    			t13 = space();
    			button3 = element("button");
    			button3.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 866, 8, 35422);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 865, 6, 35348);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 869, 6, 35504);
    			if (img.src !== (img_src_value = "image/lamden.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Lamden Logo");
    			add_location(img, file$1, 874, 12, 35981);
    			attr_dev(div2, "class", "mx-auto flex items-center justify-center w-12 h-12");
    			add_location(div2, file$1, 873, 10, 35904);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 877, 12, 36106);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file$1, 881, 14, 36305);
    			attr_dev(div3, "class", "mt-2");
    			add_location(div3, file$1, 880, 12, 36272);
    			attr_dev(div4, "class", "mt-3 text-center sm:mt-5");
    			add_location(div4, file$1, 876, 10, 36055);
    			add_location(div5, file$1, 872, 8, 35888);
    			attr_dev(button0, "type", "button");
    			button0.disabled = true;
    			attr_dev(button0, "class", "w-full mt-1inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 888, 10, 36552);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button1, file$1, 891, 8, 36960);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button2, file$1, 894, 6, 37335);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button3, file$1, 896, 24, 37717);
    			attr_dev(div6, "class", "mt-5 sm:mt-6 sm:gap-3 sm:grid-flow-row-dense");
    			add_location(div6, file$1, 887, 8, 36483);
    			attr_dev(div7, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-modal", "true");
    			attr_dev(div7, "aria-labelledby", "modal-headline");
    			attr_dev(div7, "id", "login1");
    			add_location(div7, file$1, 871, 6, 35614);
    			attr_dev(div8, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div8, file$1, 854, 4, 34963);
    			attr_dev(div9, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div9, "id", "login-existing");
    			add_location(div9, file$1, 853, 2, 34890);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div8, t0);
    			append_dev(div8, span);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, h3);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t9);
    			append_dev(div6, button1);
    			append_dev(div6, t11);
    			append_dev(div6, button2);
    			append_dev(div6, t13);
    			append_dev(div6, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*btnLoginExistingKeystoreFile*/ ctx[28], false, false, false),
    					listen_dev(button1, "click", /*btnLoginExisting24Words*/ ctx[29], false, false, false),
    					listen_dev(button2, "click", /*btnLoginExistingPrivateKey*/ ctx[31], false, false, false),
    					listen_dev(button3, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(850:2) {#if PageLoginExisting}",
    		ctx
    	});

    	return block;
    }

    // (907:2) {#if PageLoginExistingKeystoreFile}
    function create_if_block_7(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t4;
    	let div2;
    	let p;
    	let input0;
    	let t5;
    	let input1;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Select your keystore file.";
    			t4 = space();
    			div2 = element("div");
    			p = element("p");
    			input0 = element("input");
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "Next";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 923, 8, 38728);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 922, 6, 38654);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 926, 6, 38810);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 931, 12, 39261);
    			attr_dev(input0, "type", "file");
    			add_location(input0, file$1, 936, 16, 39506);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "password1");
    			attr_dev(input1, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input1, file$1, 937, 16, 39553);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 938, 16, 39714);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 941, 16, 40079);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file$1, 935, 14, 39456);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 934, 12, 39423);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 930, 10, 39210);
    			add_location(div4, file$1, 929, 8, 39194);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 928, 6, 38920);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 911, 4, 38269);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 910, 2, 38196);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(p, input0);
    			append_dev(p, t5);
    			append_dev(p, input1);
    			set_input_value(input1, /*wallet*/ ctx[3].passphrase);
    			append_dev(p, t6);
    			append_dev(p, button0);
    			append_dev(p, t8);
    			append_dev(p, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[39]),
    					listen_dev(input1, "input", unlockfile, false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[40]),
    					listen_dev(button1, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*wallet*/ 8 && input1.value !== /*wallet*/ ctx[3].passphrase) {
    				set_input_value(input1, /*wallet*/ ctx[3].passphrase);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(907:2) {#if PageLoginExistingKeystoreFile}",
    		ctx
    	});

    	return block;
    }

    // (954:2) {#if PageLoginExisting24Words}
    function create_if_block_6(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t4;
    	let div2;
    	let p0;
    	let t6;
    	let p1;
    	let input;
    	let t7;
    	let button0;
    	let t9;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Enter your 24 Word Combination to Unlock your wallet.";
    			t4 = space();
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "If your wallet fails to unlock correctly, please ensure you have entered your 24 words correctly.";
    			t6 = space();
    			p1 = element("p");
    			input = element("input");
    			t7 = space();
    			button0 = element("button");
    			button0.textContent = "Next";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 970, 8, 41157);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 969, 6, 41083);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 973, 6, 41239);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 978, 12, 41690);
    			attr_dev(p0, "class", "text-sm text-gray-500");
    			add_location(p0, file$1, 982, 14, 41904);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "24words");
    			attr_dev(input, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input, file$1, 986, 16, 42135);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm");
    			add_location(button0, file$1, 987, 16, 42260);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 990, 16, 42662);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file$1, 984, 32, 42084);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 981, 12, 41871);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 977, 10, 41639);
    			add_location(div4, file$1, 976, 8, 41623);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 975, 6, 41349);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 958, 4, 40698);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 957, 2, 40625);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t6);
    			append_dev(div2, p1);
    			append_dev(p1, input);
    			set_input_value(input, /*humanwords*/ ctx[4]);
    			append_dev(p1, t7);
    			append_dev(p1, button0);
    			append_dev(p1, t9);
    			append_dev(p1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[41]),
    					listen_dev(button0, "click", /*btnLoginExisting24Words2*/ ctx[30], false, false, false),
    					listen_dev(button1, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*humanwords*/ 16 && input.value !== /*humanwords*/ ctx[4]) {
    				set_input_value(input, /*humanwords*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(954:2) {#if PageLoginExisting24Words}",
    		ctx
    	});

    	return block;
    }

    // (1003:2) {#if PageLoginExistingPrivateKey}
    function create_if_block_5(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t4;
    	let p0;
    	let t6;
    	let div2;
    	let p1;
    	let input;
    	let t7;
    	let button0;
    	let t9;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Enter your private key.";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Reminder: We do not recommend you store an unencrypted private key on your computer, or anywhere physically not secured, as it makes it extremely trivial for anyone who has access to the key to steal your funds.";
    			t6 = space();
    			div2 = element("div");
    			p1 = element("p");
    			input = element("input");
    			t7 = space();
    			button0 = element("button");
    			button0.textContent = "Next";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 1019, 8, 43743);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 1018, 6, 43669);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 1022, 6, 43825);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 1027, 12, 44276);
    			add_location(p0, file$1, 1030, 12, 44423);
    			attr_dev(input, "type", "password");
    			attr_dev(input, "id", "privatekeyform");
    			attr_dev(input, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input, file$1, 1033, 16, 44737);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "id", "privkeycheckbtn");
    			button0.disabled = true;
    			attr_dev(button0, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button0, file$1, 1034, 16, 44875);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 1037, 16, 45304);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file$1, 1032, 14, 44687);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 1031, 12, 44654);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 1026, 10, 44225);
    			add_location(div4, file$1, 1025, 8, 44209);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 1024, 6, 43935);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 1007, 4, 43284);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 1006, 2, 43211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(div3, t4);
    			append_dev(div3, p0);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, p1);
    			append_dev(p1, input);
    			append_dev(p1, t7);
    			append_dev(p1, button0);
    			append_dev(p1, t9);
    			append_dev(p1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", privkeycheck, false, false, false),
    					listen_dev(button0, "click", /*btnLoginExistingPrivateKey2*/ ctx[32], false, false, false),
    					listen_dev(button1, "click", /*btnReset*/ ctx[26], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(1003:2) {#if PageLoginExistingPrivateKey}",
    		ctx
    	});

    	return block;
    }

    // (1065:2) {#if PageSendTau}
    function create_if_block_2(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t3;
    	let t4;
    	let t5;
    	let p0;
    	let t6;
    	let t7;
    	let t8;
    	let div2;
    	let p1;
    	let t9;
    	let input0;
    	let t10;
    	let input1;
    	let t11;
    	let button0;
    	let t13;
    	let button1;
    	let mounted;
    	let dispose;
    	let if_block0 = /*istestnet*/ ctx[0] && create_if_block_4(ctx);
    	let if_block1 = /*istestnet*/ ctx[0] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			t3 = text("Send ");
    			if (if_block0) if_block0.c();
    			t4 = text("TAU Transaction");
    			t5 = space();
    			p0 = element("p");
    			t6 = text("You can make a ");
    			if (if_block1) if_block1.c();
    			t7 = text("TAU transaction here.");
    			t8 = space();
    			div2 = element("div");
    			p1 = element("p");
    			t9 = text("To: \n              ");
    			input0 = element("input");
    			t10 = text("\n              Amount: \n              ");
    			input1 = element("input");
    			t11 = space();
    			button0 = element("button");
    			button0.textContent = "Next";
    			t13 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 1079, 6, 46354);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 1078, 4, 46282);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 1082, 4, 46430);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 1087, 10, 46871);
    			add_location(p0, file$1, 1090, 10, 47030);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "tauto");
    			attr_dev(input0, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input0, file$1, 1094, 14, 47203);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "tauamount");
    			attr_dev(input1, "class", "border py-2 px-3 text-grey-darkest w-full");
    			add_location(input1, file$1, 1096, 14, 47325);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "id", "GoNext1");
    			attr_dev(button0, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button0, file$1, 1097, 14, 47430);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "id", "privkeycheckbtn");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 1100, 14, 47824);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file$1, 1092, 12, 47136);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 1091, 10, 47105);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 1086, 8, 46822);
    			add_location(div4, file$1, 1085, 6, 46808);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 1084, 4, 46536);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 1067, 2, 45919);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 1066, 1, 45848);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(h3, t3);
    			if (if_block0) if_block0.m(h3, null);
    			append_dev(h3, t4);
    			append_dev(div3, t5);
    			append_dev(div3, p0);
    			append_dev(p0, t6);
    			if (if_block1) if_block1.m(p0, null);
    			append_dev(p0, t7);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div2, p1);
    			append_dev(p1, t9);
    			append_dev(p1, input0);
    			append_dev(p1, t10);
    			append_dev(p1, input1);
    			append_dev(p1, t11);
    			append_dev(p1, button0);
    			append_dev(p1, t13);
    			append_dev(p1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*btnSendTauSend1*/ ctx[35], false, false, false),
    					listen_dev(button1, "click", /*btnCancelAll*/ ctx[25], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*istestnet*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(h3, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*istestnet*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(p0, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(1065:2) {#if PageSendTau}",
    		ctx
    	});

    	return block;
    }

    // (1089:19) {#if istestnet}
    function create_if_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("d");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(1089:19) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (1091:28) {#if istestnet}
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("d");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1091:28) {#if istestnet}",
    		ctx
    	});

    	return block;
    }

    // (1114:2) {#if PageSendTauResult}
    function create_if_block_1(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t3;
    	let t4;
    	let p0;
    	let t5;
    	let t6;
    	let hr;
    	let t7;
    	let p1;
    	let a;
    	let t8;
    	let t9;
    	let a_href_value;
    	let t10;
    	let div2;
    	let p2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			t3 = text(/*TxResultHeading*/ ctx[5]);
    			t4 = space();
    			p0 = element("p");
    			t5 = text(/*TxResultInfo*/ ctx[6]);
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			p1 = element("p");
    			a = element("a");
    			t8 = text("Tx Hash: ");
    			t9 = text(/*TxResultHash*/ ctx[7]);
    			t10 = space();
    			div2 = element("div");
    			p2 = element("p");
    			button = element("button");
    			button.textContent = "Okay.";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 1128, 6, 48877);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 1127, 4, 48805);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 1131, 4, 48953);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 1136, 10, 49394);
    			add_location(p0, file$1, 1137, 10, 49503);
    			add_location(hr, file$1, 1138, 10, 49535);
    			attr_dev(a, "href", a_href_value = "" + (/*blockexplorer*/ ctx[2] + "transactions/" + /*TxResultHash*/ ctx[7]));
    			set_style(a, "font-size", "80%");
    			set_style(a, "overflow-wrap", "anywhere");
    			add_location(a, file$1, 1139, 37, 49577);
    			set_style(p1, "margin-top", "10px");
    			add_location(p1, file$1, 1139, 10, 49550);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "id", "privkeycheckbtn");
    			attr_dev(button, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button, file$1, 1142, 14, 49796);
    			attr_dev(p2, "class", "text-sm text-gray-500");
    			add_location(p2, file$1, 1141, 12, 49748);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 1140, 10, 49717);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 1135, 8, 49345);
    			add_location(div4, file$1, 1134, 6, 49331);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 1133, 4, 49059);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 1116, 2, 48442);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 1115, 1, 48371);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(h3, t3);
    			append_dev(div3, t4);
    			append_dev(div3, p0);
    			append_dev(p0, t5);
    			append_dev(div3, t6);
    			append_dev(div3, hr);
    			append_dev(div3, t7);
    			append_dev(div3, p1);
    			append_dev(p1, a);
    			append_dev(a, t8);
    			append_dev(a, t9);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, p2);
    			append_dev(p2, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*btnCloseTau*/ ctx[37], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*TxResultHeading*/ 32) set_data_dev(t3, /*TxResultHeading*/ ctx[5]);
    			if (dirty[0] & /*TxResultInfo*/ 64) set_data_dev(t5, /*TxResultInfo*/ ctx[6]);
    			if (dirty[0] & /*TxResultHash*/ 128) set_data_dev(t9, /*TxResultHash*/ ctx[7]);

    			if (dirty[0] & /*blockexplorer, TxResultHash*/ 132 && a_href_value !== (a_href_value = "" + (/*blockexplorer*/ ctx[2] + "transactions/" + /*TxResultHash*/ ctx[7]))) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(1114:2) {#if PageSendTauResult}",
    		ctx
    	});

    	return block;
    }

    // (1156:2) {#if PageSendTau1}
    function create_if_block(ctx) {
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div5;
    	let div4;
    	let div3;
    	let h3;
    	let t4;
    	let p0;
    	let t5;
    	let i0;
    	let t6;
    	let t7;
    	let t8;
    	let i1;
    	let t9;
    	let t10;
    	let div2;
    	let p1;
    	let button0;
    	let t12;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			span.textContent = "​";
    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Confirm Transaction";
    			t4 = space();
    			p0 = element("p");
    			t5 = text("You're sending ");
    			i0 = element("i");
    			t6 = text(/*sendamount*/ ctx[18]);
    			t7 = text(" TAU");
    			t8 = text(" to ");
    			i1 = element("i");
    			t9 = text(/*sendto*/ ctx[19]);
    			t10 = space();
    			div2 = element("div");
    			p1 = element("p");
    			button0 = element("button");
    			button0.textContent = "Confirm Transaction.";
    			t12 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-500 opacity-75");
    			add_location(div0, file$1, 1170, 6, 50842);
    			attr_dev(div1, "class", "fixed inset-0 transition-opacity");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 1169, 4, 50770);
    			attr_dev(span, "class", "hidden sm:inline-block sm:align-middle sm:h-screen");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 1173, 4, 50918);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			attr_dev(h3, "id", "modal-headline");
    			add_location(h3, file$1, 1178, 10, 51359);
    			set_style(i0, "overflow-wrap", "anywhere");
    			add_location(i0, file$1, 1179, 28, 51488);
    			set_style(i1, "overflow-wrap", "anywhere");
    			add_location(i1, file$1, 1179, 88, 51548);
    			add_location(p0, file$1, 1179, 10, 51470);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "id", "privkeycheckbtn");
    			attr_dev(button0, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button0, file$1, 1182, 14, 51690);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "id", "privkeycheckbtn");
    			attr_dev(button1, "class", "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm");
    			add_location(button1, file$1, 1185, 14, 52109);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file$1, 1181, 12, 51642);
    			attr_dev(div2, "class", "mt-2");
    			add_location(div2, file$1, 1180, 10, 51611);
    			attr_dev(div3, "class", "mt-3 text-center sm:mt-5");
    			add_location(div3, file$1, 1177, 8, 51310);
    			add_location(div4, file$1, 1176, 6, 51296);
    			attr_dev(div5, "class", "inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-modal", "true");
    			attr_dev(div5, "aria-labelledby", "modal-headline");
    			attr_dev(div5, "id", "login1");
    			add_location(div5, file$1, 1175, 4, 51024);
    			attr_dev(div6, "class", "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0");
    			add_location(div6, file$1, 1158, 2, 50407);
    			attr_dev(div7, "class", "fixed z-10 inset-0 overflow-y-auto");
    			attr_dev(div7, "id", "login-existing");
    			add_location(div7, file$1, 1157, 1, 50336);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t0);
    			append_dev(div6, span);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(div3, t4);
    			append_dev(div3, p0);
    			append_dev(p0, t5);
    			append_dev(p0, i0);
    			append_dev(i0, t6);
    			append_dev(i0, t7);
    			append_dev(p0, t8);
    			append_dev(p0, i1);
    			append_dev(i1, t9);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, p1);
    			append_dev(p1, button0);
    			append_dev(p1, t12);
    			append_dev(p1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*btnSendTauSend*/ ctx[36], false, false, false),
    					listen_dev(button1, "click", /*btnCancelAll*/ ctx[25], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*sendamount*/ 262144) set_data_dev(t6, /*sendamount*/ ctx[18]);
    			if (dirty[0] & /*sendto*/ 524288) set_data_dev(t9, /*sendto*/ ctx[19]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1156:2) {#if PageSendTau1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let link;
    	let script0;
    	let style0;
    	let script1;
    	let script1_src_value;
    	let script2;
    	let script2_src_value;
    	let t1;
    	let main1;
    	let div30;
    	let div12;
    	let div11;
    	let div1;
    	let div0;
    	let t2;
    	let div9;
    	let div2;
    	let button0;
    	let span0;
    	let t4;
    	let svg0;
    	let path0;
    	let t5;
    	let div4;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let t7;
    	let nav0;
    	let span1;
    	let svg1;
    	let path1;
    	let t8;
    	let t9;
    	let span2;
    	let svg2;
    	let path2;
    	let t10;
    	let t11;
    	let span3;
    	let svg3;
    	let path3;
    	let t12;
    	let t13;
    	let div8;
    	let span4;
    	let div7;
    	let div5;
    	let img1;
    	let img1_src_value;
    	let t14;
    	let div6;
    	let p0;
    	let t15_value = /*wallet*/ ctx[3].tau + "";
    	let t15;
    	let t16;
    	let t17;
    	let a0;
    	let t19;
    	let p1;
    	let t20_value = /*wallet*/ ctx[3].address + "";
    	let t20;
    	let t21;
    	let div10;
    	let t22;
    	let div21;
    	let div20;
    	let div19;
    	let div14;
    	let div13;
    	let img2;
    	let img2_src_value;
    	let t23;
    	let span5;
    	let t25;
    	let nav1;
    	let span6;
    	let svg4;
    	let path4;
    	let t26;
    	let t27;
    	let span7;
    	let svg5;
    	let path5;
    	let t28;
    	let t29;
    	let span8;
    	let svg6;
    	let path6;
    	let t30;
    	let t31;
    	let div18;
    	let span9;
    	let div17;
    	let div15;
    	let img3;
    	let img3_src_value;
    	let t32;
    	let div16;
    	let p2;
    	let t33_value = /*wallet*/ ctx[3].tau + "";
    	let t33;
    	let t34;
    	let t35;
    	let a1;
    	let t37;
    	let p3;
    	let t38_value = /*wallet*/ ctx[3].address + "";
    	let t38;
    	let t39;
    	let div29;
    	let div22;
    	let button1;
    	let span10;
    	let t41;
    	let svg7;
    	let path7;
    	let t42;
    	let main0;
    	let div28;
    	let div27;
    	let t43;
    	let div24;
    	let h3;
    	let t44_value = /*wallet*/ ctx[3].tau + "";
    	let t44;
    	let t45;
    	let t46;
    	let a2;
    	let t48;
    	let div23;
    	let button2;
    	let t50;
    	let div26;
    	let div25;
    	let iframe;
    	let iframe_src_value;
    	let t51;
    	let hr;
    	let br;
    	let t52;
    	let p4;
    	let i;
    	let t54;
    	let style1;
    	let t56;
    	let t57;
    	let t58;
    	let t59;
    	let t60;
    	let t61;
    	let t62;
    	let t63;
    	let t64;
    	let t65;
    	let mounted;
    	let dispose;
    	let if_block0 = /*istestnet*/ ctx[0] && create_if_block_15(ctx);
    	let if_block1 = /*istestnet*/ ctx[0] && create_if_block_14(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*istestnet*/ ctx[0]) return create_if_block_13;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);
    	let if_block3 = /*istestnet*/ ctx[0] && create_if_block_12(ctx);
    	let if_block4 = /*PageLogin*/ ctx[8] && create_if_block_11(ctx);
    	let if_block5 = /*PageLoginNew*/ ctx[9] && create_if_block_10(ctx);
    	let if_block6 = /*PageLoginNew2*/ ctx[10] && create_if_block_9(ctx);
    	let if_block7 = /*PageLoginExisting*/ ctx[11] && create_if_block_8(ctx);
    	let if_block8 = /*PageLoginExistingKeystoreFile*/ ctx[12] && create_if_block_7(ctx);
    	let if_block9 = /*PageLoginExisting24Words*/ ctx[13] && create_if_block_6(ctx);
    	let if_block10 = /*PageLoginExistingPrivateKey*/ ctx[14] && create_if_block_5(ctx);
    	let if_block11 = /*PageSendTau*/ ctx[15] && create_if_block_2(ctx);
    	let if_block12 = /*PageSendTauResult*/ ctx[17] && create_if_block_1(ctx);
    	let if_block13 = /*PageSendTau1*/ ctx[16] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link = element("link");
    			script0 = element("script");
    			style0 = element("style");
    			style0.textContent = "main { padding:0 !important;  }\n  #completebtn:disabled, #completebtnwords:disabled, button:disabled { background-color:#777 !important; color:333 }\n  ";
    			script1 = element("script");
    			script2 = element("script");
    			t1 = space();
    			main1 = element("main");
    			div30 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t2 = space();
    			div9 = element("div");
    			div2 = element("div");
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "Close sidebar";
    			t4 = space();
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t5 = space();
    			div4 = element("div");
    			div3 = element("div");
    			img0 = element("img");
    			t6 = text(" My Lamden Wallet");
    			t7 = space();
    			nav0 = element("nav");
    			span1 = element("span");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t8 = text("\n              Dashboard");
    			t9 = space();
    			span2 = element("span");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t10 = text("\n              Send TAU");
    			t11 = space();
    			span3 = element("span");
    			svg3 = svg_element("svg");
    			path3 = svg_element("path");
    			t12 = text("\n              Settings (Coming Soon)");
    			t13 = space();
    			div8 = element("div");
    			span4 = element("span");
    			div7 = element("div");
    			div5 = element("div");
    			img1 = element("img");
    			t14 = space();
    			div6 = element("div");
    			p0 = element("p");
    			t15 = text(t15_value);
    			t16 = space();
    			if (if_block0) if_block0.c();
    			t17 = text("TAU ");
    			a0 = element("a");
    			a0.textContent = "↻";
    			t19 = space();
    			p1 = element("p");
    			t20 = text(t20_value);
    			t21 = space();
    			div10 = element("div");
    			t22 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div19 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			img2 = element("img");
    			t23 = space();
    			span5 = element("span");
    			span5.textContent = "My Lamden Wallet";
    			t25 = space();
    			nav1 = element("nav");
    			span6 = element("span");
    			svg4 = svg_element("svg");
    			path4 = svg_element("path");
    			t26 = text("\n              Dashboard");
    			t27 = space();
    			span7 = element("span");
    			svg5 = svg_element("svg");
    			path5 = svg_element("path");
    			t28 = text("\n              Send TAU");
    			t29 = space();
    			span8 = element("span");
    			svg6 = svg_element("svg");
    			path6 = svg_element("path");
    			t30 = text("\n              Settings (Coming Soon)");
    			t31 = space();
    			div18 = element("div");
    			span9 = element("span");
    			div17 = element("div");
    			div15 = element("div");
    			img3 = element("img");
    			t32 = space();
    			div16 = element("div");
    			p2 = element("p");
    			t33 = text(t33_value);
    			t34 = space();
    			if (if_block1) if_block1.c();
    			t35 = text("TAU ");
    			a1 = element("a");
    			a1.textContent = "↻";
    			t37 = space();
    			p3 = element("p");
    			t38 = text(t38_value);
    			t39 = space();
    			div29 = element("div");
    			div22 = element("div");
    			button1 = element("button");
    			span10 = element("span");
    			span10.textContent = "Open sidebar";
    			t41 = space();
    			svg7 = svg_element("svg");
    			path7 = svg_element("path");
    			t42 = space();
    			main0 = element("main");
    			div28 = element("div");
    			div27 = element("div");
    			if_block2.c();
    			t43 = space();
    			div24 = element("div");
    			h3 = element("h3");
    			t44 = text(t44_value);
    			t45 = space();
    			if (if_block3) if_block3.c();
    			t46 = text("TAU ");
    			a2 = element("a");
    			a2.textContent = "↻";
    			t48 = space();
    			div23 = element("div");
    			button2 = element("button");
    			button2.textContent = "Send TAU";
    			t50 = space();
    			div26 = element("div");
    			div25 = element("div");
    			iframe = element("iframe");
    			t51 = space();
    			hr = element("hr");
    			br = element("br");
    			t52 = space();
    			p4 = element("p");
    			i = element("i");
    			i.textContent = "Transaction List provided by TauHQ";
    			t54 = space();
    			style1 = element("style");
    			style1.textContent = ".container {\n          position: relative;\n          overflow: hidden;\n          width: 100%;\n          min-width:100%;\n          padding-top: 56.25%; /* 16:9 Aspect Ratio (divide 9 by 16 = 0.5625) */\n        }\n        \n        /* Then style the iframe to fit in the container div with full height and width */\n        .responsive-iframe {\n          position: absolute;\n          top: 0;\n          left: 0;\n          bottom: 0;\n          right: 0;\n          width: 100%;\n          height: 100%;\n        }";
    			t56 = space();
    			if (if_block4) if_block4.c();
    			t57 = space();
    			if (if_block5) if_block5.c();
    			t58 = space();
    			if (if_block6) if_block6.c();
    			t59 = space();
    			if (if_block7) if_block7.c();
    			t60 = space();
    			if (if_block8) if_block8.c();
    			t61 = space();
    			if (if_block9) if_block9.c();
    			t62 = space();
    			if (if_block10) if_block10.c();
    			t63 = space();
    			if (if_block11) if_block11.c();
    			t64 = space();
    			if (if_block12) if_block12.c();
    			t65 = space();
    			if (if_block13) if_block13.c();
    			attr_dev(link, "href", "https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css");
    			attr_dev(link, "rel", "stylesheet");
    			add_location(link, file$1, 388, 2, 8827);
    			add_location(script0, file$1, 389, 0, 8915);
    			add_location(style0, file$1, 392, 0, 8935);
    			if (script1.src !== (script1_src_value = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js")) attr_dev(script1, "src", script1_src_value);
    			attr_dev(script1, "integrity", "sha512-nOQuvD9nKirvxDdvQ9OMqe2dgapbPB7vYAMrzJihw5m+aNcf0dX53m6YxM4LgA9u8e9eg9QX+/+mPu8kCNpV2A==");
    			attr_dev(script1, "crossorigin", "anonymous");
    			add_location(script1, file$1, 394, 12, 9103);
    			if (script2.src !== (script2_src_value = "/js/bip39.browser.js?PageSpeed=off")) attr_dev(script2, "src", script2_src_value);
    			attr_dev(script2, "charset", "UTF-8");
    			add_location(script2, file$1, 395, 2, 9333);
    			attr_dev(div0, "class", "absolute inset-0 bg-gray-600 opacity-75");
    			add_location(div0, file$1, 415, 8, 10085);
    			attr_dev(div1, "class", "fixed inset-0");
    			attr_dev(div1, "aria-hidden", "true");
    			add_location(div1, file$1, 414, 6, 10030);
    			attr_dev(span0, "class", "sr-only");
    			add_location(span0, file$1, 430, 12, 10813);
    			attr_dev(path0, "stroke-linecap", "round");
    			attr_dev(path0, "stroke-linejoin", "round");
    			attr_dev(path0, "stroke-width", "2");
    			attr_dev(path0, "d", "M6 18L18 6M6 6l12 12");
    			add_location(path0, file$1, 433, 14, 11061);
    			attr_dev(svg0, "class", "h-6 w-6 text-white");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "fill", "none");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			attr_dev(svg0, "stroke", "currentColor");
    			attr_dev(svg0, "aria-hidden", "true");
    			add_location(svg0, file$1, 432, 12, 10906);
    			attr_dev(button0, "class", "ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white");
    			add_location(button0, file$1, 429, 10, 10657);
    			attr_dev(div2, "class", "absolute top-0 right-0 -mr-12 pt-2");
    			add_location(div2, file$1, 428, 8, 10598);
    			attr_dev(img0, "class", "h-8 w-auto");
    			if (img0.src !== (img0_src_value = "/image/lamden.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "My Lamden Wallet");
    			add_location(img0, file$1, 439, 12, 11345);
    			attr_dev(div3, "class", "flex-shrink-0 flex items-center px-4");
    			add_location(div3, file$1, 438, 10, 11282);
    			attr_dev(path1, "stroke-linecap", "round");
    			attr_dev(path1, "stroke-linejoin", "round");
    			attr_dev(path1, "stroke-width", "2");
    			attr_dev(path1, "d", "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6");
    			add_location(path1, file$1, 445, 16, 11915);
    			attr_dev(svg1, "class", "mr-4 h-6 w-6 text-indigo-300");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			attr_dev(svg1, "stroke", "currentColor");
    			attr_dev(svg1, "aria-hidden", "true");
    			add_location(svg1, file$1, 444, 14, 11748);
    			attr_dev(span1, "class", "bg-indigo-800 text-white group flex items-center px-2 py-2 text-base font-medium rounded-md");
    			add_location(span1, file$1, 443, 12, 11627);
    			attr_dev(path2, "stroke-linecap", "round");
    			attr_dev(path2, "stroke-linejoin", "round");
    			attr_dev(path2, "stroke-width", "2");
    			attr_dev(path2, "d", "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z");
    			add_location(path2, file$1, 452, 16, 12529);
    			attr_dev(svg2, "class", "mr-4 h-6 w-6 text-indigo-300");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "fill", "none");
    			attr_dev(svg2, "viewBox", "0 0 24 24");
    			attr_dev(svg2, "stroke", "currentColor");
    			attr_dev(svg2, "aria-hidden", "true");
    			add_location(svg2, file$1, 451, 14, 12362);
    			attr_dev(span2, "class", "text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md");
    			add_location(span2, file$1, 450, 12, 12215);
    			attr_dev(path3, "stroke-linecap", "round");
    			attr_dev(path3, "stroke-linejoin", "round");
    			attr_dev(path3, "stroke-width", "2");
    			attr_dev(path3, "d", "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z");
    			add_location(path3, file$1, 459, 16, 13107);
    			attr_dev(svg3, "class", "mr-4 h-6 w-6 text-indigo-300");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "fill", "none");
    			attr_dev(svg3, "viewBox", "0 0 24 24");
    			attr_dev(svg3, "stroke", "currentColor");
    			attr_dev(svg3, "aria-hidden", "true");
    			add_location(svg3, file$1, 458, 14, 12940);
    			attr_dev(span3, "class", "text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md");
    			add_location(span3, file$1, 457, 12, 12793);
    			attr_dev(nav0, "class", "mt-5 px-2 space-y-1");
    			add_location(nav0, file$1, 441, 10, 11461);
    			attr_dev(div4, "class", "flex-1 h-0 pt-5 pb-4 overflow-y-auto");
    			add_location(div4, file$1, 437, 8, 11221);
    			attr_dev(img1, "class", "inline-block h-10 w-10 rounded-full");
    			if (img1.src !== (img1_src_value = "/image/lamden.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$1, 491, 16, 15468);
    			add_location(div5, file$1, 490, 14, 15446);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$1, 495, 56, 15720);
    			attr_dev(p0, "class", "text-base font-medium text-white");
    			add_location(p0, file$1, 494, 16, 15619);
    			attr_dev(p1, "class", "text-sm font-medium text-indigo-200 group-hover:text-white");
    			set_style(p1, "overflow-wrap", "anywhere");
    			add_location(p1, file$1, 497, 16, 15807);
    			attr_dev(div6, "class", "ml-3");
    			add_location(div6, file$1, 493, 14, 15584);
    			attr_dev(div7, "class", "flex items-center");
    			add_location(div7, file$1, 489, 12, 15400);
    			attr_dev(span4, "class", "flex-shrink-0 group block");
    			add_location(span4, file$1, 488, 10, 15347);
    			attr_dev(div8, "class", "flex-shrink-0 flex border-t border-indigo-800 p-4");
    			add_location(div8, file$1, 487, 8, 15273);
    			attr_dev(div9, "class", "relative flex-1 flex flex-col max-w-xs w-full bg-indigo-700");
    			add_location(div9, file$1, 427, 6, 10516);
    			attr_dev(div10, "class", "flex-shrink-0 w-14");
    			attr_dev(div10, "aria-hidden", "true");
    			add_location(div10, file$1, 505, 6, 16057);
    			attr_dev(div11, "class", "fixed inset-0 flex z-40");
    			add_location(div11, file$1, 403, 4, 9650);
    			attr_dev(div12, "class", "md:hidden");
    			add_location(div12, file$1, 402, 2, 9622);
    			attr_dev(img2, "class", "h-8 w-auto");
    			if (img2.src !== (img2_src_value = "/image/lamden.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "My Lamden Wallet");
    			add_location(img2, file$1, 519, 12, 16612);
    			attr_dev(span5, "class", "text-sm text-white");
    			add_location(span5, file$1, 519, 84, 16684);
    			attr_dev(div13, "class", "flex items-center flex-shrink-0 px-4");
    			add_location(div13, file$1, 517, 10, 16548);
    			attr_dev(path4, "stroke-linecap", "round");
    			attr_dev(path4, "stroke-linejoin", "round");
    			attr_dev(path4, "stroke-width", "2");
    			attr_dev(path4, "d", "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6");
    			add_location(path4, file$1, 525, 16, 17270);
    			attr_dev(svg4, "class", "mr-3 h-6 w-6 text-indigo-300");
    			attr_dev(svg4, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg4, "fill", "none");
    			attr_dev(svg4, "viewBox", "0 0 24 24");
    			attr_dev(svg4, "stroke", "currentColor");
    			attr_dev(svg4, "aria-hidden", "true");
    			add_location(svg4, file$1, 524, 14, 17103);
    			attr_dev(span6, "class", "bg-indigo-800 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md");
    			add_location(span6, file$1, 522, 12, 16941);
    			attr_dev(path5, "stroke-linecap", "round");
    			attr_dev(path5, "stroke-linejoin", "round");
    			attr_dev(path5, "stroke-width", "2");
    			attr_dev(path5, "d", "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z");
    			add_location(path5, file$1, 532, 16, 17905);
    			attr_dev(svg5, "class", "mr-3 h-6 w-6 text-indigo-300");
    			attr_dev(svg5, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg5, "fill", "none");
    			attr_dev(svg5, "viewBox", "0 0 24 24");
    			attr_dev(svg5, "stroke", "currentColor");
    			attr_dev(svg5, "aria-hidden", "true");
    			add_location(svg5, file$1, 531, 14, 17738);
    			attr_dev(span7, "class", "text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md");
    			add_location(span7, file$1, 530, 12, 17570);
    			attr_dev(path6, "stroke-linecap", "round");
    			attr_dev(path6, "stroke-linejoin", "round");
    			attr_dev(path6, "stroke-width", "2");
    			attr_dev(path6, "d", "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z");
    			add_location(path6, file$1, 539, 16, 18481);
    			attr_dev(svg6, "class", "mr-3 h-6 w-6 text-indigo-300");
    			attr_dev(svg6, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg6, "fill", "none");
    			attr_dev(svg6, "viewBox", "0 0 24 24");
    			attr_dev(svg6, "stroke", "currentColor");
    			attr_dev(svg6, "aria-hidden", "true");
    			add_location(svg6, file$1, 538, 14, 18314);
    			attr_dev(span8, "class", "text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md");
    			add_location(span8, file$1, 537, 12, 18169);
    			attr_dev(nav1, "class", "mt-5 flex-1 px-2 space-y-1");
    			add_location(nav1, file$1, 520, 10, 16768);
    			attr_dev(div14, "class", "flex-1 flex flex-col pt-5 pb-4 overflow-y-auto");
    			add_location(div14, file$1, 516, 8, 16477);
    			attr_dev(img3, "class", "inline-block h-9 w-9 rounded-full");
    			if (img3.src !== (img3_src_value = "/image/lamden.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "lamden");
    			set_style(img3, "height", "30px");
    			set_style(img3, "width", "30px");
    			set_style(img3, "max-width", "30px");
    			set_style(img3, "min-width", "30px");
    			add_location(img3, file$1, 571, 16, 20852);
    			add_location(div15, file$1, 570, 14, 20830);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$1, 578, 56, 21227);
    			attr_dev(p2, "class", "text-sm font-medium text-white");
    			add_location(p2, file$1, 577, 16, 21128);
    			attr_dev(p3, "class", "text-xs font-medium text-indigo-200 group-hover:text-white");
    			set_style(p3, "overflow-wrap", "anywhere");
    			add_location(p3, file$1, 580, 16, 21314);
    			attr_dev(div16, "class", "ml-3");
    			add_location(div16, file$1, 576, 14, 21093);
    			attr_dev(div17, "class", "flex items-center");
    			add_location(div17, file$1, 569, 12, 20784);
    			attr_dev(span9, "class", "flex-shrink-0 w-full group block");
    			add_location(span9, file$1, 568, 10, 20724);
    			attr_dev(div18, "class", "flex-shrink-0 flex border-t border-indigo-800 p-4");
    			add_location(div18, file$1, 567, 8, 20650);
    			attr_dev(div19, "class", "flex flex-col h-0 flex-1");
    			add_location(div19, file$1, 515, 6, 16430);
    			attr_dev(div20, "class", "flex flex-col w-64");
    			add_location(div20, file$1, 513, 4, 16306);
    			attr_dev(div21, "class", "hidden bg-indigo-700 md:flex md:flex-shrink-0");
    			add_location(div21, file$1, 512, 2, 16242);
    			attr_dev(span10, "class", "sr-only");
    			add_location(span10, file$1, 593, 8, 21902);
    			attr_dev(path7, "stroke-linecap", "round");
    			attr_dev(path7, "stroke-linejoin", "round");
    			attr_dev(path7, "stroke-width", "2");
    			attr_dev(path7, "d", "M4 6h16M4 12h16M4 18h16");
    			add_location(path7, file$1, 596, 10, 22129);
    			attr_dev(svg7, "class", "h-6 w-6");
    			attr_dev(svg7, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg7, "fill", "none");
    			attr_dev(svg7, "viewBox", "0 0 24 24");
    			attr_dev(svg7, "stroke", "currentColor");
    			attr_dev(svg7, "aria-hidden", "true");
    			add_location(svg7, file$1, 595, 8, 21989);
    			attr_dev(button1, "class", "-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500");
    			add_location(button1, file$1, 592, 6, 21695);
    			attr_dev(div22, "class", "md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3");
    			add_location(div22, file$1, 591, 4, 21639);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$1, 651, 54, 24755);
    			attr_dev(h3, "class", "text-lg leading-6 font-medium text-gray-900");
    			add_location(h3, file$1, 650, 12, 24644);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500");
    			add_location(button2, file$1, 654, 14, 24889);
    			attr_dev(div23, "class", "mt-3 flex sm:mt-0 sm:ml-4");
    			add_location(div23, file$1, 653, 12, 24835);
    			attr_dev(div24, "class", "pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between");
    			add_location(div24, file$1, 649, 10, 24545);
    			attr_dev(iframe, "class", "responsive-iframe");
    			attr_dev(iframe, "id", "iframe");
    			if (iframe.src !== (iframe_src_value = "https://www.tauhq.com/addresses/" + /*wallet*/ ctx[3].address)) attr_dev(iframe, "src", iframe_src_value);
    			set_style(iframe, "margin-top", "-140px");
    			add_location(iframe, file$1, 666, 22, 25761);
    			attr_dev(div25, "class", "container");
    			add_location(div25, file$1, 665, 20, 25715);
    			attr_dev(div26, "class", "pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between");
    			add_location(div26, file$1, 664, 18, 25608);
    			add_location(hr, file$1, 669, 16, 25966);
    			add_location(br, file$1, 669, 20, 25970);
    			add_location(i, file$1, 671, 16, 26043);
    			set_style(p4, "clear", "both");
    			set_style(p4, "width", "100%");
    			add_location(p4, file$1, 670, 16, 25993);
    			add_location(style1, file$1, 672, 8, 26097);
    			attr_dev(div27, "class", "max-w-7xl mx-auto px-4 sm:px-6 md:px-8");
    			add_location(div27, file$1, 602, 8, 22401);
    			attr_dev(div28, "class", "py-12");
    			add_location(div28, file$1, 601, 6, 22373);
    			attr_dev(main0, "class", "w-full\t flex-1 relative z-0 overflow-y-auto focus:outline-none");
    			attr_dev(main0, "tabindex", "0");
    			add_location(main0, file$1, 600, 4, 22276);
    			attr_dev(div29, "class", "flex flex-col w-0 flex-1 overflow-hidden");
    			add_location(div29, file$1, 590, 2, 21580);
    			attr_dev(div30, "class", "h-screen flex overflow-hidden bg-gray-100");
    			add_location(div30, file$1, 400, 0, 9483);
    			add_location(main1, file$1, 397, 0, 9425);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link);
    			append_dev(document_1.head, script0);
    			append_dev(document_1.head, style0);
    			append_dev(document_1.head, script1);
    			append_dev(document_1.head, script2);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main1, anchor);
    			append_dev(main1, div30);
    			append_dev(div30, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div1);
    			append_dev(div1, div0);
    			append_dev(div11, t2);
    			append_dev(div11, div9);
    			append_dev(div9, div2);
    			append_dev(div2, button0);
    			append_dev(button0, span0);
    			append_dev(button0, t4);
    			append_dev(button0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div9, t5);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, img0);
    			append_dev(div3, t6);
    			append_dev(div4, t7);
    			append_dev(div4, nav0);
    			append_dev(nav0, span1);
    			append_dev(span1, svg1);
    			append_dev(svg1, path1);
    			append_dev(span1, t8);
    			append_dev(nav0, t9);
    			append_dev(nav0, span2);
    			append_dev(span2, svg2);
    			append_dev(svg2, path2);
    			append_dev(span2, t10);
    			append_dev(nav0, t11);
    			append_dev(nav0, span3);
    			append_dev(span3, svg3);
    			append_dev(svg3, path3);
    			append_dev(span3, t12);
    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			append_dev(div8, span4);
    			append_dev(span4, div7);
    			append_dev(div7, div5);
    			append_dev(div5, img1);
    			append_dev(div7, t14);
    			append_dev(div7, div6);
    			append_dev(div6, p0);
    			append_dev(p0, t15);
    			append_dev(p0, t16);
    			if (if_block0) if_block0.m(p0, null);
    			append_dev(p0, t17);
    			append_dev(p0, a0);
    			append_dev(div6, t19);
    			append_dev(div6, p1);
    			append_dev(p1, t20);
    			append_dev(div11, t21);
    			append_dev(div11, div10);
    			append_dev(div30, t22);
    			append_dev(div30, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, div14);
    			append_dev(div14, div13);
    			append_dev(div13, img2);
    			append_dev(div13, t23);
    			append_dev(div13, span5);
    			append_dev(div14, t25);
    			append_dev(div14, nav1);
    			append_dev(nav1, span6);
    			append_dev(span6, svg4);
    			append_dev(svg4, path4);
    			append_dev(span6, t26);
    			append_dev(nav1, t27);
    			append_dev(nav1, span7);
    			append_dev(span7, svg5);
    			append_dev(svg5, path5);
    			append_dev(span7, t28);
    			append_dev(nav1, t29);
    			append_dev(nav1, span8);
    			append_dev(span8, svg6);
    			append_dev(svg6, path6);
    			append_dev(span8, t30);
    			append_dev(div19, t31);
    			append_dev(div19, div18);
    			append_dev(div18, span9);
    			append_dev(span9, div17);
    			append_dev(div17, div15);
    			append_dev(div15, img3);
    			append_dev(div17, t32);
    			append_dev(div17, div16);
    			append_dev(div16, p2);
    			append_dev(p2, t33);
    			append_dev(p2, t34);
    			if (if_block1) if_block1.m(p2, null);
    			append_dev(p2, t35);
    			append_dev(p2, a1);
    			append_dev(div16, t37);
    			append_dev(div16, p3);
    			append_dev(p3, t38);
    			append_dev(div30, t39);
    			append_dev(div30, div29);
    			append_dev(div29, div22);
    			append_dev(div22, button1);
    			append_dev(button1, span10);
    			append_dev(button1, t41);
    			append_dev(button1, svg7);
    			append_dev(svg7, path7);
    			append_dev(div29, t42);
    			append_dev(div29, main0);
    			append_dev(main0, div28);
    			append_dev(div28, div27);
    			if_block2.m(div27, null);
    			append_dev(div27, t43);
    			append_dev(div27, div24);
    			append_dev(div24, h3);
    			append_dev(h3, t44);
    			append_dev(h3, t45);
    			if (if_block3) if_block3.m(h3, null);
    			append_dev(h3, t46);
    			append_dev(h3, a2);
    			append_dev(div24, t48);
    			append_dev(div24, div23);
    			append_dev(div23, button2);
    			append_dev(div27, t50);
    			append_dev(div27, div26);
    			append_dev(div26, div25);
    			append_dev(div25, iframe);
    			append_dev(div27, t51);
    			append_dev(div27, hr);
    			append_dev(div27, br);
    			append_dev(div27, t52);
    			append_dev(div27, p4);
    			append_dev(p4, i);
    			append_dev(div27, t54);
    			append_dev(div27, style1);
    			append_dev(main1, t56);
    			if (if_block4) if_block4.m(main1, null);
    			append_dev(main1, t57);
    			if (if_block5) if_block5.m(main1, null);
    			append_dev(main1, t58);
    			if (if_block6) if_block6.m(main1, null);
    			append_dev(main1, t59);
    			if (if_block7) if_block7.m(main1, null);
    			append_dev(main1, t60);
    			if (if_block8) if_block8.m(main1, null);
    			append_dev(main1, t61);
    			if (if_block9) if_block9.m(main1, null);
    			append_dev(main1, t62);
    			if (if_block10) if_block10.m(main1, null);
    			append_dev(main1, t63);
    			if (if_block11) if_block11.m(main1, null);
    			append_dev(main1, t64);
    			if (if_block12) if_block12.m(main1, null);
    			append_dev(main1, t65);
    			if (if_block13) if_block13.m(main1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*refreshbalance*/ ctx[20], false, false, false),
    					listen_dev(span7, "click", /*btnSendTau*/ ctx[34], false, false, false),
    					listen_dev(a1, "click", /*refreshbalance*/ ctx[20], false, false, false),
    					listen_dev(a2, "click", /*refreshbalance*/ ctx[20], false, false, false),
    					listen_dev(button2, "click", /*btnSendTau*/ ctx[34], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*wallet*/ 8 && t15_value !== (t15_value = /*wallet*/ ctx[3].tau + "")) set_data_dev(t15, t15_value);

    			if (/*istestnet*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_15(ctx);
    					if_block0.c();
    					if_block0.m(p0, t17);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*wallet*/ 8 && t20_value !== (t20_value = /*wallet*/ ctx[3].address + "")) set_data_dev(t20, t20_value);
    			if (dirty[0] & /*wallet*/ 8 && t33_value !== (t33_value = /*wallet*/ ctx[3].tau + "")) set_data_dev(t33, t33_value);

    			if (/*istestnet*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_14(ctx);
    					if_block1.c();
    					if_block1.m(p2, t35);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*wallet*/ 8 && t38_value !== (t38_value = /*wallet*/ ctx[3].address + "")) set_data_dev(t38, t38_value);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div27, t43);
    				}
    			}

    			if (dirty[0] & /*wallet*/ 8 && t44_value !== (t44_value = /*wallet*/ ctx[3].tau + "")) set_data_dev(t44, t44_value);

    			if (/*istestnet*/ ctx[0]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_12(ctx);
    					if_block3.c();
    					if_block3.m(h3, t46);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty[0] & /*wallet*/ 8 && iframe.src !== (iframe_src_value = "https://www.tauhq.com/addresses/" + /*wallet*/ ctx[3].address)) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}

    			if (/*PageLogin*/ ctx[8]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_11(ctx);
    					if_block4.c();
    					if_block4.m(main1, t57);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*PageLoginNew*/ ctx[9]) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_10(ctx);
    					if_block5.c();
    					if_block5.m(main1, t58);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*PageLoginNew2*/ ctx[10]) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_9(ctx);
    					if_block6.c();
    					if_block6.m(main1, t59);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*PageLoginExisting*/ ctx[11]) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_8(ctx);
    					if_block7.c();
    					if_block7.m(main1, t60);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*PageLoginExistingKeystoreFile*/ ctx[12]) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_7(ctx);
    					if_block8.c();
    					if_block8.m(main1, t61);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*PageLoginExisting24Words*/ ctx[13]) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block_6(ctx);
    					if_block9.c();
    					if_block9.m(main1, t62);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (/*PageLoginExistingPrivateKey*/ ctx[14]) {
    				if (if_block10) {
    					if_block10.p(ctx, dirty);
    				} else {
    					if_block10 = create_if_block_5(ctx);
    					if_block10.c();
    					if_block10.m(main1, t63);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (/*PageSendTau*/ ctx[15]) {
    				if (if_block11) {
    					if_block11.p(ctx, dirty);
    				} else {
    					if_block11 = create_if_block_2(ctx);
    					if_block11.c();
    					if_block11.m(main1, t64);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (/*PageSendTauResult*/ ctx[17]) {
    				if (if_block12) {
    					if_block12.p(ctx, dirty);
    				} else {
    					if_block12 = create_if_block_1(ctx);
    					if_block12.c();
    					if_block12.m(main1, t65);
    				}
    			} else if (if_block12) {
    				if_block12.d(1);
    				if_block12 = null;
    			}

    			if (/*PageSendTau1*/ ctx[16]) {
    				if (if_block13) {
    					if_block13.p(ctx, dirty);
    				} else {
    					if_block13 = create_if_block(ctx);
    					if_block13.c();
    					if_block13.m(main1, null);
    				}
    			} else if (if_block13) {
    				if_block13.d(1);
    				if_block13 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			detach_dev(script0);
    			detach_dev(style0);
    			detach_dev(script1);
    			detach_dev(script2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			if (if_block12) if_block12.d();
    			if (if_block13) if_block13.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function passcheck() {
    	var password1 = document.getElementById("password1");
    	var password2 = document.getElementById("password2");

    	if (password1.value != password2.value) {
    		document.getElementById("completebtn").disabled = true;
    		console.log("Bad");
    	} else {
    		document.getElementById("completebtn").disabled = false;
    		console.log("Good");
    	}
    }

    /****
     * checks priv key fits description
    */
    function privkeycheck() {
    	var privkeycheck = document.getElementById("privatekeyform");

    	if (privkeycheck.value.length == 64) {
    		document.getElementById("privkeycheckbtn").disabled = false;
    	} else {
    		document.getElementById("privkeycheckbtn").disabled = true;
    	}
    }

    /********************
     * unlockfile
     * *****************
     * Unlocks the keystore file. Unlock File
    */
    function unlockfile() {
    	
    }

    /** SHA256 function ****/
    async function sha256(message) {
    	// encode as UTF-8
    	const msgBuffer = new TextEncoder().encode(message);

    	// hash the message
    	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

    	// convert ArrayBuffer to Array
    	const hashArray = Array.from(new Uint8Array(hashBuffer));

    	// convert bytes to hex string                  
    	hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("");

    	return hashArray;
    }

    function sha512(str) {
    	return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str));
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let istestnet = false;
    	let files;
    	let blockexplorer;

    	let wallet = {
    		loggedIn: false,
    		tau: 0,
    		address: "None",
    		privatekey: "Unknown",
    		passphrase: "",
    		words24: ""
    	};

    	let networkInfo = {
    		name: "Lamden Public Testnet",
    		type: "testnet",
    		hosts: ["https://testnet-master-1.lamden.io:443"]
    	};

    	let Net;
    	let sk = "";
    	let vk = "";
    	let keys = "";
    	let humanwords = "";
    	let computerwords = "";
    	let hash = "";
    	let privatekeyform = "";
    	let TxResultHeading = "Please wait...";
    	let TxResultInfo = "Getting information...";
    	let TxResultHash = "";

    	/****************
     * Wallet functions
    */
    	function testnet(testnet) {
    		if (testnet == true) {
    			$$invalidate(0, istestnet = true);
    			$$invalidate(2, blockexplorer = "https://testnet.lamden.io/");

    			networkInfo = {
    				name: "Lamden Public Testnet",
    				type: "testnet",
    				hosts: ["https://testnet-master-1.lamden.io:443"]
    			};

    			Net = new Lamden.Network({
    					name: "Lamden Public Testnet",
    					type: "testnet",
    					hosts: ["https://testnet-master-1.lamden.io:443"]
    				});
    		} else {
    			$$invalidate(0, istestnet = false);
    			$$invalidate(2, blockexplorer = "https://mainnet.lamden.io/");

    			networkInfo = {
    				name: "Lamden Mainnet",
    				type: "mainnet",
    				hosts: ["https://masternode-01.lamden.io:443"]
    			};

    			Net = new Lamden.Network({
    					name: "Lamden Mainnet",
    					type: "mainnet",
    					hosts: ["https://masternode-01.lamden.io:443"]
    				});
    		}
    	}

    	async function login(vk, sk) {
    		$$invalidate(3, wallet.tau = await Net.API.getCurrencyBalance(vk), wallet);
    		$$invalidate(3, wallet.address = vk, wallet);
    		$$invalidate(3, wallet.privatekey = sk, wallet);
    		$$invalidate(3, wallet.loggedIn = true, wallet);
    		Net.ping();
    		document.getElementById("iframe").contentWindow.location.reload();
    	}

    	async function refreshbalance() {
    		$$invalidate(3, wallet.tau = await Net.API.getCurrencyBalance(wallet.address), wallet);
    		console.log("lol");
    	}

    	function sendTAU(amount, receiver) {
    		let senderVk = wallet.address;

    		let kwargs = {
    			to: receiver,
    			amount: { "__fixed__": amount.toString() }
    		};

    		let txInfo = {
    			senderVk,
    			contractName: "currency",
    			methodName: "transfer",
    			kwargs,
    			stampLimit: 50
    		};

    		let tx = new Lamden.TransactionBuilder(networkInfo, txInfo);
    		let senderSk = wallet.privatekey;

    		tx.events.on("response", response => {
    			if (tx.resultInfo.type === "error") {
    				$$invalidate(5, TxResultHeading = tx.resultInfo.title);
    				$$invalidate(6, TxResultInfo = tx.resultInfo.subtitle);
    				$$invalidate(7, TxResultHash = tx.txSendResult.hash);
    				return;
    			}

    			console.log(response);
    			$$invalidate(5, TxResultHeading = tx.resultInfo.title);
    			$$invalidate(6, TxResultInfo = tx.resultInfo.subtitle);
    			$$invalidate(7, TxResultHash = tx.txSendResult.hash);
    		});

    		tx.send(senderSk).then(() => tx.checkForTransactionResult());
    		$$invalidate(15, PageSendTau = false);
    		$$invalidate(17, PageSendTauResult = true);
    	}

    	/******************************
     *   PAGE ROUTING             *
     ******************************
     * 
     * Yeah, this is the page routing. It's large, It's clunky, It's tedious, but it works. */
    	let PageLogin = false;

    	let PageLoginNew = false;
    	let PageLoginNew2 = false;
    	let PageLoginExisting = false;
    	let PageLoginExistingKeystoreFile = false;
    	let PageLoginExisting24Words = false;
    	let PageLoginExistingPrivateKey = false;
    	let PageSendTau = false;
    	let PageSendTau1 = false;
    	let PageSendTauResult = false;
    	PageLogin = true;

    	function btnExistingWallet() {
    		testnet(false);
    		$$invalidate(8, PageLogin = false);
    		$$invalidate(11, PageLoginExisting = true);
    	}

    	function btnExistingWalletTN() {
    		testnet(true);
    		$$invalidate(8, PageLogin = false);
    		$$invalidate(11, PageLoginExisting = true);
    	}

    	function btnCreateWallet() {
    		testnet(false);
    		$$invalidate(8, PageLogin = false);
    		$$invalidate(9, PageLoginNew = true);
    		get24Words();
    	}

    	function btnCreateWalletTN() {
    		testnet(true);
    		$$invalidate(8, PageLogin = false);
    		$$invalidate(9, PageLoginNew = true);
    		get24Words();
    	}

    	function btnCancelAll() {
    		$$invalidate(8, PageLogin = false);
    		$$invalidate(9, PageLoginNew = false);
    		$$invalidate(10, PageLoginNew2 = false);
    		$$invalidate(11, PageLoginExisting = false);
    		$$invalidate(12, PageLoginExistingKeystoreFile = false);
    		$$invalidate(13, PageLoginExisting24Words = false);
    		$$invalidate(14, PageLoginExistingPrivateKey = false);
    		$$invalidate(15, PageSendTau = false);
    		$$invalidate(16, PageSendTau1 = false);
    		$$invalidate(17, PageSendTauResult = false);
    	}

    	function btnReset() {
    		$$invalidate(8, PageLogin = true);
    		$$invalidate(9, PageLoginNew = false);
    		$$invalidate(10, PageLoginNew2 = false);
    		$$invalidate(11, PageLoginExisting = false);
    		$$invalidate(12, PageLoginExistingKeystoreFile = false);
    		$$invalidate(13, PageLoginExisting24Words = false);
    		$$invalidate(14, PageLoginExistingPrivateKey = false);
    		$$invalidate(15, PageSendTau = false);
    		$$invalidate(16, PageSendTau1 = false);
    		$$invalidate(17, PageSendTauResult = false);
    	}

    	function btnCreateWalletNext() {
    		$$invalidate(10, PageLoginNew2 = false);
    	}

    	function btnLoginExistingKeystoreFile() {
    		$$invalidate(11, PageLoginExisting = false);
    		$$invalidate(12, PageLoginExistingKeystoreFile = true);
    	}

    	function btnLoginExisting24Words() {
    		$$invalidate(11, PageLoginExisting = false);
    		$$invalidate(13, PageLoginExisting24Words = true);
    	}

    	async function btnLoginExisting24Words2() {
    		hash = await bip39.mnemonicToSeed(humanwords);
    		hash = hash.slice(0, 32);
    		keys = Lamden.wallet.new_wallet(hash);
    		login(keys.vk, keys.sk);
    		$$invalidate(13, PageLoginExisting24Words = false);
    	}

    	function btnLoginExistingPrivateKey() {
    		$$invalidate(11, PageLoginExisting = false);
    		$$invalidate(14, PageLoginExistingPrivateKey = true);
    	}

    	function btnLoginExistingPrivateKey2() {
    		var sk2 = document.getElementById("privatekeyform");
    		sk = sk2.value;
    		console.log(sk);
    		$$invalidate(14, PageLoginExistingPrivateKey = false);
    		vk = Lamden.wallet.get_vk(sk);
    		console.log(vk);
    		login(vk, sk);
    	}

    	function btnConfirmWords() {
    		$$invalidate(9, PageLoginNew = false);
    		$$invalidate(10, PageLoginNew2 = true);
    	}

    	function btnSendTau() {
    		$$invalidate(15, PageSendTau = true);
    	}

    	let sendamount = "";
    	let sendto = "";

    	function btnSendTauSend1() {
    		/* Confirm */
    		$$invalidate(15, PageSendTau = false);

    		$$invalidate(16, PageSendTau1 = true);
    		$$invalidate(18, sendamount = Lamden.Encoder("bigNumber", document.getElementById("tauamount").value));
    		$$invalidate(19, sendto = document.getElementById("tauto").value);
    	}

    	function btnSendTauSend() {
    		sendTAU(sendamount, sendto);
    		$$invalidate(16, PageSendTau1 = false);
    		$$invalidate(17, PageSendTauResult = true);
    	}

    	function btnSendTauClose() {
    		$$invalidate(15, PageSendTau = false);
    	}

    	function btnCloseTau() {
    		$$invalidate(17, PageSendTauResult = false);
    	}

    	/*********************
     *  Words Check
     * *******************
     * Validates the 24 words.
    */
    	function wordscheck() {
    		var words24 = document.getElementById("words24");

    		if (words24.value == humanwords) {
    			document.getElementById("completebtnwords").removeAttribute("disabled");
    		} else {
    			document.getElementById("completebtnwords").setAttribute("disabled", "disabled");
    		}
    	}

    	/*** Functions to generate good numbers.. mostly unused   **/
    	const randomFloat = function () {
    		const int = window.crypto.getRandomValues(new Uint32Array(1))[0];
    		return int / 2 ** 32;
    	};

    	const randomInt = function (min, max) {
    		const range = max - min;
    		return Math.floor(randomFloat() * range + min);
    	};

    	const randomIntArray = function (length, min, max) {
    		return new Array(length).fill(0).map(() => randomInt(min, max));
    	};

    	async function get24Words() {
    		$$invalidate(4, humanwords = bip39.generateMnemonic(256));
    		hash = await bip39.mnemonicToSeed(humanwords);
    		hash = hash.slice(0, 32);
    		keys = Lamden.wallet.new_wallet(hash);
    		login(keys.vk, keys.sk);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		files = this.files;
    		$$invalidate(1, files);
    	}

    	function input1_input_handler() {
    		wallet.passphrase = this.value;
    		$$invalidate(3, wallet);
    	}

    	function input_input_handler() {
    		humanwords = this.value;
    		$$invalidate(4, humanwords);
    	}

    	$$self.$capture_state = () => ({
    		istestnet,
    		files,
    		blockexplorer,
    		wallet,
    		Lamden,
    		Login,
    		Buffer: buffer,
    		networkInfo,
    		Net,
    		sk,
    		vk,
    		keys,
    		humanwords,
    		computerwords,
    		hash,
    		privatekeyform,
    		TxResultHeading,
    		TxResultInfo,
    		TxResultHash,
    		testnet,
    		login,
    		refreshbalance,
    		sendTAU,
    		PageLogin,
    		PageLoginNew,
    		PageLoginNew2,
    		PageLoginExisting,
    		PageLoginExistingKeystoreFile,
    		PageLoginExisting24Words,
    		PageLoginExistingPrivateKey,
    		PageSendTau,
    		PageSendTau1,
    		PageSendTauResult,
    		btnExistingWallet,
    		btnExistingWalletTN,
    		btnCreateWallet,
    		btnCreateWalletTN,
    		btnCancelAll,
    		btnReset,
    		btnCreateWalletNext,
    		btnLoginExistingKeystoreFile,
    		btnLoginExisting24Words,
    		btnLoginExisting24Words2,
    		btnLoginExistingPrivateKey,
    		btnLoginExistingPrivateKey2,
    		btnConfirmWords,
    		btnSendTau,
    		sendamount,
    		sendto,
    		btnSendTauSend1,
    		btnSendTauSend,
    		btnSendTauClose,
    		btnCloseTau,
    		passcheck,
    		wordscheck,
    		privkeycheck,
    		unlockfile,
    		sha256,
    		randomFloat,
    		randomInt,
    		randomIntArray,
    		get24Words,
    		sha512
    	});

    	$$self.$inject_state = $$props => {
    		if ("istestnet" in $$props) $$invalidate(0, istestnet = $$props.istestnet);
    		if ("files" in $$props) $$invalidate(1, files = $$props.files);
    		if ("blockexplorer" in $$props) $$invalidate(2, blockexplorer = $$props.blockexplorer);
    		if ("wallet" in $$props) $$invalidate(3, wallet = $$props.wallet);
    		if ("networkInfo" in $$props) networkInfo = $$props.networkInfo;
    		if ("Net" in $$props) Net = $$props.Net;
    		if ("sk" in $$props) sk = $$props.sk;
    		if ("vk" in $$props) vk = $$props.vk;
    		if ("keys" in $$props) keys = $$props.keys;
    		if ("humanwords" in $$props) $$invalidate(4, humanwords = $$props.humanwords);
    		if ("computerwords" in $$props) computerwords = $$props.computerwords;
    		if ("hash" in $$props) hash = $$props.hash;
    		if ("privatekeyform" in $$props) privatekeyform = $$props.privatekeyform;
    		if ("TxResultHeading" in $$props) $$invalidate(5, TxResultHeading = $$props.TxResultHeading);
    		if ("TxResultInfo" in $$props) $$invalidate(6, TxResultInfo = $$props.TxResultInfo);
    		if ("TxResultHash" in $$props) $$invalidate(7, TxResultHash = $$props.TxResultHash);
    		if ("PageLogin" in $$props) $$invalidate(8, PageLogin = $$props.PageLogin);
    		if ("PageLoginNew" in $$props) $$invalidate(9, PageLoginNew = $$props.PageLoginNew);
    		if ("PageLoginNew2" in $$props) $$invalidate(10, PageLoginNew2 = $$props.PageLoginNew2);
    		if ("PageLoginExisting" in $$props) $$invalidate(11, PageLoginExisting = $$props.PageLoginExisting);
    		if ("PageLoginExistingKeystoreFile" in $$props) $$invalidate(12, PageLoginExistingKeystoreFile = $$props.PageLoginExistingKeystoreFile);
    		if ("PageLoginExisting24Words" in $$props) $$invalidate(13, PageLoginExisting24Words = $$props.PageLoginExisting24Words);
    		if ("PageLoginExistingPrivateKey" in $$props) $$invalidate(14, PageLoginExistingPrivateKey = $$props.PageLoginExistingPrivateKey);
    		if ("PageSendTau" in $$props) $$invalidate(15, PageSendTau = $$props.PageSendTau);
    		if ("PageSendTau1" in $$props) $$invalidate(16, PageSendTau1 = $$props.PageSendTau1);
    		if ("PageSendTauResult" in $$props) $$invalidate(17, PageSendTauResult = $$props.PageSendTauResult);
    		if ("sendamount" in $$props) $$invalidate(18, sendamount = $$props.sendamount);
    		if ("sendto" in $$props) $$invalidate(19, sendto = $$props.sendto);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		istestnet,
    		files,
    		blockexplorer,
    		wallet,
    		humanwords,
    		TxResultHeading,
    		TxResultInfo,
    		TxResultHash,
    		PageLogin,
    		PageLoginNew,
    		PageLoginNew2,
    		PageLoginExisting,
    		PageLoginExistingKeystoreFile,
    		PageLoginExisting24Words,
    		PageLoginExistingPrivateKey,
    		PageSendTau,
    		PageSendTau1,
    		PageSendTauResult,
    		sendamount,
    		sendto,
    		refreshbalance,
    		btnExistingWallet,
    		btnExistingWalletTN,
    		btnCreateWallet,
    		btnCreateWalletTN,
    		btnCancelAll,
    		btnReset,
    		btnCreateWalletNext,
    		btnLoginExistingKeystoreFile,
    		btnLoginExisting24Words,
    		btnLoginExisting24Words2,
    		btnLoginExistingPrivateKey,
    		btnLoginExistingPrivateKey2,
    		btnConfirmWords,
    		btnSendTau,
    		btnSendTauSend1,
    		btnSendTauSend,
    		btnCloseTau,
    		wordscheck,
    		input0_change_handler,
    		input1_input_handler,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
