module.exports = {
  setRandomValues,
};

function setRandomValues(userContext, events, done) {
  const dates = ['2025-10-22', '2025-10-23', '2025-10-24', '2025-10-25'];
  const partySizes = [2, 3, 4, 5, 6, 8];
  const durations = [60, 75, 90, 120];

  userContext.vars.$randomDate = dates[Math.floor(Math.random() * dates.length)];
  userContext.vars.$randomPartySize = partySizes[Math.floor(Math.random() * partySizes.length)];
  userContext.vars.$randomDuration = durations[Math.floor(Math.random() * durations.length)];
  userContext.vars.$uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return done();
}



