(function registerPromptGeneratorCore(global) {
  function joinSelections(selections, key) {
    return (selections[key] || []).join(', ');
  }

  function buildPrompt(selections) {
    const parts = [];

    const subjectParts = [];
    const count = joinSelections(selections, 'count');
    const ethnicity = joinSelections(selections, 'ethnicity');
    const age = joinSelections(selections, 'age');
    const gender = joinSelections(selections, 'gender');
    if (count) subjectParts.push(count);
    if (ethnicity) subjectParts.push(ethnicity);
    if (age) subjectParts.push(age);
    if (gender) subjectParts.push(gender);
    if (subjectParts.length) parts.push(subjectParts.join(' ') + '의 인물');

    const hairParts = [];
    const hairColor = joinSelections(selections, 'hair-color');
    const hairLength = joinSelections(selections, 'hair-length');
    const hairStyle = joinSelections(selections, 'hair-style');
    if (hairColor) hairParts.push(hairColor + ' 색');
    if (hairLength) hairParts.push(hairLength);
    if (hairStyle) hairParts.push(hairStyle);
    if (hairParts.length) parts.push(hairParts.join(' ') + ' 머리카락');

    const faceParts = [];
    const faceShape = joinSelections(selections, 'face-shape');
    const eyes = joinSelections(selections, 'eyes');
    const expression = joinSelections(selections, 'expression');
    if (faceShape) faceParts.push(faceShape + ' 얼굴형');
    if (eyes) faceParts.push(eyes);
    if (expression) faceParts.push(expression + ' 표정');
    if (faceParts.length) parts.push(faceParts.join(', '));

    const bodyParts = [];
    const bodyType = joinSelections(selections, 'body-type');
    const height = joinSelections(selections, 'height');
    const skin = joinSelections(selections, 'skin');
    if (bodyType) bodyParts.push(bodyType + ' 체형');
    if (height) bodyParts.push(height);
    if (skin) bodyParts.push(skin);
    if (bodyParts.length) parts.push(bodyParts.join(', '));

    const outfitParts = [];
    const outfit = joinSelections(selections, 'outfit');
    const top = joinSelections(selections, 'top');
    const bottom = joinSelections(selections, 'bottom');
    const shoes = joinSelections(selections, 'shoes');
    const accessories = joinSelections(selections, 'accessories');
    if (outfit) {
      outfitParts.push(outfit);
    } else {
      if (top) outfitParts.push(top);
      if (bottom) outfitParts.push(bottom);
    }
    if (shoes) outfitParts.push(shoes + ' 신발');
    if (accessories) outfitParts.push(accessories + ' 착용');
    if (outfitParts.length) parts.push('의상: ' + outfitParts.join(', '));

    const actionParts = [];
    const pose = joinSelections(selections, 'pose');
    const action = joinSelections(selections, 'action');
    if (pose) actionParts.push(pose + ' 자세');
    if (action) actionParts.push(action + ' 중');
    if (actionParts.length) parts.push(actionParts.join(', '));

    const locations = []
      .concat(selections['location-indoor'] || [])
      .concat(selections['location-outdoor'] || [])
      .concat(selections['location-special'] || []);
    if (locations.length) parts.push(locations.join(', ') + ' 배경');

    const timeWeatherParts = [];
    const time = joinSelections(selections, 'time');
    const weather = joinSelections(selections, 'weather');
    if (time) timeWeatherParts.push(time);
    if (weather) timeWeatherParts.push(weather);
    if (timeWeatherParts.length) parts.push(timeWeatherParts.join(' '));

    const atmosphereParts = [];
    const mood = joinSelections(selections, 'mood');
    const lighting = joinSelections(selections, 'lighting');
    if (mood) atmosphereParts.push(mood + ' 분위기');
    if (lighting) atmosphereParts.push(lighting + ' 조명');
    if (atmosphereParts.length) parts.push(atmosphereParts.join(', '));

    const cameraParts = [];
    const shot = joinSelections(selections, 'shot');
    const style = joinSelections(selections, 'style');
    if (shot) cameraParts.push(shot + ' 구도');
    if (style) cameraParts.push(style);
    if (cameraParts.length) parts.push(cameraParts.join(', '));

    return parts.join(', ');
  }

  global.PromptGeneratorCore = {
    buildPrompt,
  };
})(window);
