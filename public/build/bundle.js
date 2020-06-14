
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
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.23.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let span;
    	let t5;
    	let div1;
    	let t6;
    	let t7;
    	let t8_value = (/*min*/ ctx[3].toString().length === 1 ? "0" : "") + "";
    	let t8;
    	let t9;
    	let t10;
    	let t11_value = (/*sec*/ ctx[4].toString().length === 1 ? "0" : "") + "";
    	let t11;
    	let t12;

    	const block = {
    		c: function create() {
    			main = element("main");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			div0 = element("div");
    			t2 = text(/*day*/ ctx[1]);
    			t3 = text(".");
    			span = element("span");
    			span.textContent = `${/*date*/ ctx[5]}`;
    			t5 = space();
    			div1 = element("div");
    			t6 = text(/*hour*/ ctx[2]);
    			t7 = text(" : ");
    			t8 = text(t8_value);
    			t9 = text(/*min*/ ctx[3]);
    			t10 = text(" : ");
    			t11 = text(t11_value);
    			t12 = text(/*sec*/ ctx[4]);
    			if (img0.src !== (img0_src_value = /*showSun*/ ctx[0] ? "morning.png" : "night.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "id", "sunandmoon");
    			attr_dev(img0, "class", "svelte-2lz5yt");
    			add_location(img0, file, 55, 1, 632);
    			if (img1.src !== (img1_src_value = "clockfinal.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file, 57, 1, 747);
    			set_style(span, "margin-left", "16px");
    			add_location(span, file, 58, 25, 801);
    			attr_dev(div0, "class", "date svelte-2lz5yt");
    			add_location(div0, file, 58, 1, 777);
    			attr_dev(div1, "class", "date time svelte-2lz5yt");
    			add_location(div1, file, 59, 1, 855);
    			add_location(main, file, 54, 0, 624);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, img0);
    			append_dev(main, t0);
    			append_dev(main, img1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, span);
    			append_dev(main, t5);
    			append_dev(main, div1);
    			append_dev(div1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    			append_dev(div1, t11);
    			append_dev(div1, t12);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showSun*/ 1 && img0.src !== (img0_src_value = /*showSun*/ ctx[0] ? "morning.png" : "night.png")) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*day*/ 2) set_data_dev(t2, /*day*/ ctx[1]);
    			if (dirty & /*hour*/ 4) set_data_dev(t6, /*hour*/ ctx[2]);
    			if (dirty & /*min*/ 8 && t8_value !== (t8_value = (/*min*/ ctx[3].toString().length === 1 ? "0" : "") + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*min*/ 8) set_data_dev(t9, /*min*/ ctx[3]);
    			if (dirty & /*sec*/ 16 && t11_value !== (t11_value = (/*sec*/ ctx[4].toString().length === 1 ? "0" : "") + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*sec*/ 16) set_data_dev(t12, /*sec*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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

    function instance($$self, $$props, $$invalidate) {
    	let d = new Date();
    	const date = d.getDate();
    	let dayOrNight = "AM";
    	let showSun = null;
    	let day;

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(6, d = new Date());
    				dayOrNight = hour >= 12 ? "pm" : "am";

    				if (hour >= 19 && hour <= 6) {
    					$$invalidate(0, showSun = true);
    				} else {
    					$$invalidate(0, showSun = false);
    				}
    			},
    			1000
    		);
    	});

    	switch (d.getDay()) {
    		case 0:
    			day = "Sun";
    		case 1:
    			day = "Mon";
    		case 2:
    			day = "Tue";
    		case 3:
    			day = "Wed";
    		case 4:
    			day = "Thu";
    		case 5:
    			day = "Fri";
    		case 6:
    			day = "Sat";
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		onMount,
    		d,
    		date,
    		dayOrNight,
    		showSun,
    		day,
    		hour,
    		min,
    		sec
    	});

    	$$self.$inject_state = $$props => {
    		if ("d" in $$props) $$invalidate(6, d = $$props.d);
    		if ("dayOrNight" in $$props) dayOrNight = $$props.dayOrNight;
    		if ("showSun" in $$props) $$invalidate(0, showSun = $$props.showSun);
    		if ("day" in $$props) $$invalidate(1, day = $$props.day);
    		if ("hour" in $$props) $$invalidate(2, hour = $$props.hour);
    		if ("min" in $$props) $$invalidate(3, min = $$props.min);
    		if ("sec" in $$props) $$invalidate(4, sec = $$props.sec);
    	};

    	let hour;
    	let min;
    	let sec;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*d*/ 64) {
    			 $$invalidate(2, hour = d.getHours());
    		}

    		if ($$self.$$.dirty & /*d*/ 64) {
    			 $$invalidate(3, min = d.getMinutes());
    		}

    		if ($$self.$$.dirty & /*d*/ 64) {
    			 $$invalidate(4, sec = d.getSeconds());
    		}
    	};

    	return [showSun, day, hour, min, sec, date];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
