const steps = {
    parseStepsInput(steps) {
        steps = parseInt(steps);
        if (isNaN(steps) || steps <= 0) throw new Error('Invalid steps');
        return steps;
    }
};

export default steps;