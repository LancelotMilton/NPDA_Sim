$(document).ready(function() {
    const paper = Raphael("mainbar", "100%", "100%");
    const EPSILON = 'ε';
    let selectedItem = null;

    // --- Data Model ---
    let automaton = {
        states: {},
        transitions: []
    };
    let history = []; // For undo functionality

    // --- Constants for drawing ---
    const ATTRS = {
        state: {
            "fill": "#fff",
            "stroke": "#333",
            "stroke-width": 2,
            "cursor": "pointer"
        },
        stateLabel: {
            "font-size": 16,
            "font-weight": "bold",
            "cursor": "pointer"
        },
        finalState: {
            "stroke": "#333",
            "stroke-width": 2
        },
        initialArrow: {
            "stroke": "#333",
            "stroke-width": 2,
            "arrow-end": "classic-wide-long"
        },
        transition: {
            "stroke": "#555",
            "stroke-width": 2,
            "arrow-end": "classic-wide-long"
        },
        transitionLabel: {
            "font-size": 14,
            "fill": "#007bff"
        }
    };
    const STATE_RADIUS = 30;

    // --- Sidebar Generation ---
    const buildSidebar = () => {
        const sidebar = $("#sidebar");
        sidebar.html(`
            <div class="togglebar">
                <div class="togglebar-header">Actions</div>
                <div class="togglebar-content" style="display: block;">
                    <div class="btn-group">
                        <button id="btn-create-state" class="btn">Create State</button>
                        <button id="btn-create-transition" class="btn">Create Transition</button>
                        <button id="btn-undo" class="btn undo">Undo</button>
                        <button id="btn-clear" class="btn clear">Clear All</button>
                    </div>
                </div>
            </div>

            <div class="togglebar">
                <div class="togglebar-header">Selected Item</div>
                <div class="togglebar-content" id="selected-item-view">
                    <p>Click on a state to see details.</p>
                </div>
            </div>

            <div class="togglebar">
                <div class="togglebar-header">Test Cases</div>
                <div class="togglebar-content">
                    <textarea id="test-cases-input" placeholder="Enter one input string per line..."></textarea>
                    <button id="test-cases-run" class="btn">Run Simulation</button>
                    <div id="output-terminal"></div>
                </div>
            </div>

            <div class="togglebar">
                <div class="togglebar-header">Transitions</div>
                <div class="togglebar-content" id="transitions-list"></div>
            </div>

            <div class="togglebar">
                <div class="togglebar-header">States</div>
                <div class="togglebar-content" id="states-list"></div>
            </div>
        `);
    };
    // --- State and Transition Drawing ---
    const drawAutomaton = () => {
        paper.clear();
        // Draw transitions first so they are behind states
        automaton.transitions.forEach(drawTransition);
        // Draw states
        Object.values(automaton.states).forEach(drawState);
    };

    
    const drawState = (state) => {
        // Remove old Raphael visuals if re-drawing
        if (state.raphaelSet) {
            state.raphaelSet.remove();
        }
        if (state.raphaelFinalCircle) {
            state.raphaelFinalCircle.remove();
            state.raphaelFinalCircle = null;
        }
        if (state.raphaelInitialArrow) {
            state.raphaelInitialArrow.remove();
            state.raphaelInitialArrow = null;
        }

    // Main circle
        state.raphaelCircle = paper.circle(state.x, state.y, STATE_RADIUS).attr(ATTRS.state);

    // Label
        state.raphaelLabel = paper.text(state.x, state.y, state.name).attr(ATTRS.stateLabel);

    // Combine into a set for dragging
        state.raphaelSet = paper.set(state.raphaelCircle, state.raphaelLabel);

    // Add visual indicators
        updateStateVisuals(state);

    // Add event listeners
        state.raphaelSet.click(() => selectState(state));

    // Drag functionality
        state.raphaelSet.drag(
            function (dx, dy) {
                const newX = state.ox + dx;
                const newY = state.oy + dy;

            // Update coordinates
                state.x = newX;
                state.y = newY;

            // Move main circle and label
                state.raphaelCircle.attr({ cx: newX, cy: newY });
                state.raphaelLabel.attr({ x: newX, y: newY });

            // Move final state circle if present
                if (state.raphaelFinalCircle) {
                    state.raphaelFinalCircle.attr({ cx: newX, cy: newY });
                }

            // Move initial arrow if present
                if (state.raphaelInitialArrow) {
                    const path = `M${newX - STATE_RADIUS - 30},${newY}L${newX - STATE_RADIUS},${newY}`;
                    state.raphaelInitialArrow.attr({ path });
                }

            // Update transitions
                updateTransitionsForState(state.name);
            },
            function () {
                state.ox = state.x;
                state.oy = state.y;
            },
            function () {
                saveState("drag state");
            }
        );
    };
    /* const drawState = (state) => {
        // Main circle
        state.raphaelCircle = paper.circle(state.x, state.y, STATE_RADIUS).attr(ATTRS.state);

        // Label
        state.raphaelLabel = paper.text(state.x, state.y, state.name).attr(ATTRS.stateLabel);

        // Combine into a set for dragging
        state.raphaelSet = paper.set(state.raphaelCircle, state.raphaelLabel);

        // Add visual indicators
        updateStateVisuals(state);
        // Add event listeners
        state.raphaelSet.click(() => selectState(state));
        state.raphaelSet.drag(
    function(dx, dy) {
        const newX = state.ox + dx;
        const newY = state.oy + dy;
        
        // Update coordinates
        state.x = newX;
        state.y = newY;
        
        // Move main circle and label
        state.raphaelCircle.attr({ cx: newX, cy: newY });
        state.raphaelLabel.attr({ x: newX, y: newY });

        // Move final state circle if present
        if (state.raphaelFinalCircle) {
            state.raphaelFinalCircle.attr({ cx: newX, cy: newY });
        }

        // Move initial arrow if present
        if (state.raphaelInitialArrow) {
            const path = `M${newX - STATE_RADIUS - 30},${newY}L${newX - STATE_RADIUS},${newY}`;
            state.raphaelInitialArrow.attr({ path });
        }
        // Update transitions
        updateTransitionsForState(state.name);
    },
    function() { // drag start
        state.ox = state.x;
        state.oy = state.y;
    },
    function() { // drag end
        saveState("drag state");
    }
);

    };
*/
    const updateStateVisuals = (state) => {
        // Final state (double circle)
        if (state.isFinal) {
            if (!state.raphaelFinalCircle) {
                state.raphaelFinalCircle = paper.circle(state.x, state.y, STATE_RADIUS - 5).attr(ATTRS.finalState);
                state.raphaelSet.push(state.raphaelFinalCircle);
            }
            state.raphaelFinalCircle.toBack();
            state.raphaelCircle.toFront();
            state.raphaelLabel.toFront();
        } else if (state.raphaelFinalCircle) {
            state.raphaelFinalCircle.remove();
            state.raphaelFinalCircle = null;
        }

        // Initial state (incoming arrow)
        if (state.isInitial) {
            if (!state.raphaelInitialArrow) {
                const path = `M${state.x - STATE_RADIUS - 30},${state.y}L${state.x - STATE_RADIUS},${state.y}`;
                state.raphaelInitialArrow = paper.path(path).attr(ATTRS.initialArrow);
                state.raphaelSet.push(state.raphaelInitialArrow);
            }
             state.raphaelInitialArrow.attr({ path: `M${state.x - STATE_RADIUS - 30},${state.y}L${state.x - STATE_RADIUS},${state.y}` });
        } else if (state.raphaelInitialArrow) {
            state.raphaelInitialArrow.remove();
            state.raphaelInitialArrow = null;
        }
    };

    const drawTransition = (trans) => {
        const fromState = automaton.states[trans.from];
        const toState = automaton.states[trans.to];
        if (!fromState || !toState) return;

        const label = `${trans.input || EPSILON}, ${trans.pop || EPSILON} → ${trans.push || EPSILON}`;

        if (fromState === toState) { // Self-loop
            const x = fromState.x;
            const y = fromState.y - STATE_RADIUS;
            const path = `M${x - 15},${y} A20,25 0 1,1 ${x + 15},${y}`;
            trans.raphaelPath = paper.path(path).attr(ATTRS.transition);
            trans.raphaelLabel = paper.text(x, y - 30, label).attr(ATTRS.transitionLabel);
        } else {
            const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
            const startX = fromState.x + STATE_RADIUS * Math.cos(angle);
            const startY = fromState.y + STATE_RADIUS * Math.sin(angle);
            const endX = toState.x - STATE_RADIUS * Math.cos(angle);
            const endY = toState.y - STATE_RADIUS * Math.sin(angle);
            
            // Introduce a curve for multiple transitions
            const existingCount = automaton.transitions.filter(t => t.from === trans.from && t.to === trans.to).length;
            const curve = (existingCount > 1) ? 20 * (existingCount -1) : 0;
            const midX = (startX + endX) / 2 - curve * Math.sin(angle);
            const midY = (startY + endY) / 2 + curve * Math.cos(angle);
            
            const path = `M${startX},${startY}Q${midX},${midY} ${endX},${endY}`;
            trans.raphaelPath = paper.path(path).attr(ATTRS.transition);
            trans.raphaelLabel = paper.text(midX, midY, label).attr(ATTRS.transitionLabel);
        }
        trans.raphaelSet = paper.set(trans.raphaelPath, trans.raphaelLabel);
    };
    
    const updateTransitionsForState = (stateName) => {
        automaton.transitions.forEach(trans => {
            if (trans.from === stateName || trans.to === stateName) {
                if(trans.raphaelSet) trans.raphaelSet.remove();
                drawTransition(trans);
            }
        });
    };

    // --- UI Update Functions ---
    const updateAllViews = () => {
        updateStatesList();
        updateTransitionsList();
        updateSelectedItemView();
        drawAutomaton();
    };

    const updateStatesList = () => {
        const list = $("#states-list");
        list.empty();
        Object.values(automaton.states).forEach(state => { list.append(` <div class="list-item"> <span>${state.name} ${state.isInitial ? '(Initial)' : ''} ${state.isFinal ? '(Final)' : ''}</span> <button class="btn delete btn-delete-state" data-name="${state.name}">Delete</button> </div> `); }); }; const updateTransitionsList = () => { const list = $("#transitions-list"); list.empty();
        automaton.transitions.forEach((trans, index) => {
            const label = `(${trans.from}, ${trans.input || EPSILON}, ${trans.pop || EPSILON}) → (${trans.to}, ${trans.push || EPSILON})`;
            list.append(`
                <div class="list-item">
                    <span class="list-item-label">${label}</span>
                    <button class="btn delete btn-delete-transition" data-index="${index}">Delete</button>
                </div>
            `);
        });
    };

    const updateSelectedItemView = () => {
        const view = $("#selected-item-view");
        if (!selectedItem) {
            view.html("<p>Click on a state to see details.</p>");
            return;
        }
        const state = automaton.states[selectedItem];
        view.html(`
            <div class="form-group">
                <label>State Name:</label>
                <input type="text" id="selected-name" value="${state.name}" readonly/>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="selected-is-initial" ${state.isInitial ? 'checked' : ''}/>
                    Is Initial State
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="selected-is-final" ${state.isFinal ? 'checked' : ''}/>
                    Is Final State
                </label>
            </div>
        `);
    };
    
    // --- State Selection ---
    const selectState = (state) => {
        selectedItem = state.name;
        // Highlight selected state
        Object.values(automaton.states).forEach(s => {
            s.raphaelCircle.attr({ "stroke": "#333" });
        });
        state.raphaelCircle.attr({ "stroke": "#007bff" });
        updateSelectedItemView();
    };

    // --- History Management ---
    /* const saveState = (actionDescription) => {
        // Simple history: deep copy of the automaton state.
        // Note: This doesn't save Raphael objects, which is why we redraw.
        const snapshot = JSON.stringify(automaton);
        history.push(snapshot);
        if (history.length > 20) history.shift(); // Limit history size
    }; */
    //corrected saveState, May not work like it's supposed to 
    const saveState = (actionDescription) => {
        // Create a deep copy of the automaton that is safe to stringify
        // by excluding the non-serializable Raphael JS objects.
        const cleanAutomaton = {
            states: {},
            transitions: []
        };

        // 1. Copy states, but only the serializable data properties.
        for (const stateName in automaton.states) {
            const state = automaton.states[stateName];
            cleanAutomaton.states[stateName] = {
                name: state.name,
                x: state.x,
                y: state.y,
                isInitial: state.isInitial,
                isFinal: state.isFinal
                // Note: We explicitly DO NOT copy raphaelCircle, raphaelSet, etc.
            };
        }

        // 2. Copy transitions, excluding any Raphael properties.
        cleanAutomaton.transitions = automaton.transitions.map(trans => ({
            from: trans.from,
            to: trans.to,
            input: trans.input,
            pop: trans.pop,
            push: trans.push
            // Note: We explicitly DO NOT copy raphaelPath, raphaelSet, etc.
        }));

        const snapshot = JSON.stringify(cleanAutomaton);
        history.push(snapshot);
        if (history.length > 20) history.shift(); // Limit history size
    };

    const undo = () => {
        if (history.length <= 1) { // Need at least one state to revert to
            alert("Nothing to undo.");
            return;
        }
        history.pop(); // Remove current state
        const lastState = history[history.length - 1];
        automaton = JSON.parse(lastState);
        selectedItem = null;
        updateAllViews();
    };

    // --- Core Actions ---
    const createState = () => {
        const name = prompt("Enter a name for the new state:");
        if (!name) return;
        if (automaton.states[name]) {
            alert("A state with this name already exists.");
            return;
        }
        saveState("create state");
        const x = 100 + (Object.keys(automaton.states).length % 5) * 120;
        const y = 100 + Math.floor(Object.keys(automaton.states).length / 5) * 120;

        automaton.states[name] = {
            name: name,
            x: x, y: y,
            isInitial: Object.keys(automaton.states).length === 0, // First state is initial
            isFinal: false
        };
        updateAllViews();
    };
    
    const createTransition = () => {
        const from = prompt("From state:");
        if (!from || !automaton.states[from]) {
            if (from) alert("Source state not found.");
            return;
        }
        const to = prompt("To state:");
        if (!to || !automaton.states[to]) {
            if (to) alert("Destination state not found.");
            return;
        }
        const input = prompt("Input symbol (leave empty for ε):");
        const pop = prompt("Stack symbol to read (leave empty for ε):");
        const push = prompt("Stack symbol(s) to write (leave empty for ε):");

        saveState("create transition");
        automaton.transitions.push({ from, to, input, pop, push });
        updateAllViews();
    };

    const deleteState = (name) => {
        if (!automaton.states[name]) return;
        saveState("delete state");
        
        // Delete transitions connected to this state
        automaton.transitions = automaton.transitions.filter(t => t.from !== name && t.to !== name);
        
        // Delete the state itself
        delete automaton.states[name];

        if (selectedItem === name) selectedItem = null;
        updateAllViews();
    };

    const deleteTransition = (index) => {
        if (index < 0 || index >= automaton.transitions.length) return;
        saveState("delete transition");
        automaton.transitions.splice(index, 1);
        updateAllViews();
    };
    
    const clearAll = () => {
        if (!confirm("Are you sure you want to clear everything?")) return;
        saveState("clear all");
        automaton = { states: {}, transitions: [] };
        selectedItem = null;
        $("#output-terminal").html("");
        updateAllViews();
    };

    // --- Simulation Logic ---
    const runSimulation = () => {
        const inputs = $("#test-cases-input").val().split('\n').filter(line => line.trim() !== '');
        const output = $("#output-terminal");
        output.empty();

        const initialStates = Object.values(automaton.states).filter(s => s.isInitial);
        if (initialStates.length !== 1) {
            output.html('<span class="result-rejected">Error: Exactly one initial state is required.</span>');
            return;
        }
        const initialState = initialStates[0].name;

        inputs.forEach(inputString => {
            const result = simulate(initialState, inputString);
            const resultClass = result ? 'result-accepted' : 'result-rejected';
            const resultText = result ? 'Accepted' : 'Rejected';
            output.append(`<div>'${inputString}': <span class="${resultClass}">${resultText}</span></div>`);
        });
    };

    const simulate = (initialState, inputString) => {
        // A "configuration" is [state, remainingInput, stack]
        let queue = [[initialState, inputString, ['Z']]];
        const visited = new Set(); // To prevent infinite loops with ε-transitions

        while (queue.length > 0) {
            const [currentState, remainingInput, stack] = queue.shift();
            
            // Acceptance condition: input is consumed and we are in a final state
            if (remainingInput.length === 0 && automaton.states[currentState].isFinal) {
                return true; // Accepted
            }
            
            // Avoid getting stuck in cycles
            const visitedKey = `${currentState}|${remainingInput}|${stack.slice(0, 20).join(',')}`;
            if (visited.has(visitedKey)) {
                continue;
            }
            visited.add(visitedKey);

            // Find applicable transitions
            automaton.transitions.forEach(trans => {
                if (trans.from !== currentState) return;

                const topOfStack = stack.length > 0 ? stack[stack.length - 1] : '';

                // Match transitions that consume input
                if (trans.input && remainingInput.startsWith(trans.input)) {
                    if (trans.pop === '' || trans.pop === topOfStack) {
                        const newStack = [...stack];
                        if (trans.pop !== '') newStack.pop();
                        if (trans.push !== '') newStack.push(...trans.push.split('').reverse());
                        
                        queue.push([trans.to, remainingInput.substring(trans.input.length), newStack]);
                    }
                }
                // Match ε-transitions (no input consumed)
                else if (trans.input === '') {
                     if (trans.pop === '' || trans.pop === topOfStack) {
                        const newStack = [...stack];
                        if (trans.pop !== '') newStack.pop();
                        if (trans.push !== '') newStack.push(...trans.push.split('').reverse());
                        
                        queue.push([trans.to, remainingInput, newStack]);
                    }
                }
            });
        }
        return false; // Rejected
    };


    // --- Event Listeners ---
    buildSidebar();
    
    // Togglebar functionality
    $("#sidebar").on("click", ".togglebar-header", function() {
        $(this).next(".togglebar-content").slideToggle(200);
    });
    
    // Action buttons
    $("#sidebar").on("click", "#btn-create-state", createState);
    $("#sidebar").on("click", "#btn-create-transition", createTransition);
    $("#sidebar").on("click", "#btn-undo", undo);
    $("#sidebar").on("click", "#btn-clear", clearAll);
    $("#sidebar").on("click", "#test-cases-run", runSimulation);

    // List deletion buttons
    $("#sidebar").on("click", ".btn-delete-state", function() {
        deleteState($(this).data("name"));
    });
    $("#sidebar").on("click", ".btn-delete-transition", function() {
        deleteTransition($(this).data("index"));
    });

    // Selected item changes
    /* $("#sidebar").on("change", "#selected-is-initial", function() {
        if (!selectedItem) return;
        saveState("set initial state");
        const isChecked = $(this).is(":checked");
        // Ensure only one initial state
        Object.values(automaton.states).forEach(s => s.isInitial = false);
        automaton.states[selectedItem].isInitial = isChecked;
        updateAllViews();
    });
    */ 
    //New CheckBox Handler (with probable bug fixes):
    // Handle Initial checkbox
    $("#sidebar").on("change", "#selected-is-initial", function () {
        if (!selectedItem) return;
        saveState("set initial state");

        const isChecked = $(this).is(":checked");

        // Ensure only one initial state
        Object.values(automaton.states).forEach(s => {
            s.isInitial = false;
        });

        // Set the current state as initial (if checked)
        automaton.states[selectedItem].isInitial = isChecked;

        // Refresh visuals for ALL states
        Object.values(automaton.states).forEach(updateStateVisuals);

        // Refresh sidebar
        updateSelectedItemView();
    });

    // Handle Final checkbox
    $("#sidebar").on("change", "#selected-is-final", function () {
        if (!selectedItem) return;
        saveState("set final state");

        const isChecked = $(this).is(":checked");

        // Update final state flag
        automaton.states[selectedItem].isFinal = isChecked;

        // Refresh visuals for ALL states
        Object.values(automaton.states).forEach(updateStateVisuals);

        // Refresh sidebar
        updateSelectedItemView();
    });
});
