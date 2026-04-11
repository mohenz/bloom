(function registerPromptGeneratorCore(global) {
  const dataModule = global.PromptGeneratorData || {};
  const EN_LABELS = dataModule.EN_LABELS || {};

  function joinSelections(selections, key) {
    return (selections[key] || []).join(', ');
  }

  function getSelections(selections, key) {
    return (selections[key] || []).filter(Boolean);
  }

  function formatList(values) {
    const filtered = values.filter(Boolean);
    if (!filtered.length) return '';
    return filtered.join(', ');
  }

  function formatCount(count) {
    const countMap = {
      '1명': '한 명의',
      '2명': '두 명의',
      '소그룹': '소그룹의',
      '다수': '여러 명의',
    };
    return countMap[count] || (count ? count + '의' : '');
  }

  function formatGender(values) {
    return values.map(function mapGender(value) {
      if (value === '중성적') return '중성적인';
      return value;
    });
  }

  function hasAnySelections(selections) {
    return Object.keys(selections).some(function hasSelectedValue(key) {
      return Array.isArray(selections[key]) && selections[key].length > 0;
    });
  }

  function translateSelections(selections, key) {
    const labelMap = EN_LABELS[key] || {};
    return getSelections(selections, key)
      .map(function mapLabel(value) {
        return labelMap[value] || '';
      })
      .filter(Boolean);
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
    const faceImpression = joinSelections(selections, 'face-impression');
    const eyes = joinSelections(selections, 'eyes');
    const expression = joinSelections(selections, 'expression');
    if (faceShape) faceParts.push(faceShape + ' 얼굴형');
    if (faceImpression) faceParts.push(faceImpression + ' 인상');
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
    const quality = joinSelections(selections, 'quality');
    if (shot) cameraParts.push(shot + ' 구도');
    if (style) cameraParts.push(style);
    if (quality) cameraParts.push(quality);
    if (cameraParts.length) parts.push(cameraParts.join(', '));

    return parts.join(', ');
  }

  function buildEnglishPrompt(selections) {
    const parts = [];

    const subjectParts = []
      .concat(translateSelections(selections, 'count'))
      .concat(translateSelections(selections, 'ethnicity'))
      .concat(translateSelections(selections, 'age'))
      .concat(translateSelections(selections, 'gender'));
    if (subjectParts.length) parts.push(subjectParts.join(', '));

    const hairParts = []
      .concat(translateSelections(selections, 'hair-color'))
      .concat(translateSelections(selections, 'hair-length'))
      .concat(translateSelections(selections, 'hair-style'));
    if (hairParts.length) parts.push(hairParts.join(', '));

    const faceParts = []
      .concat(translateSelections(selections, 'face-shape'))
      .concat(translateSelections(selections, 'face-impression'))
      .concat(translateSelections(selections, 'eyes'))
      .concat(translateSelections(selections, 'expression'));
    if (faceParts.length) parts.push(faceParts.join(', '));

    const bodyParts = []
      .concat(translateSelections(selections, 'body-type'))
      .concat(translateSelections(selections, 'height'))
      .concat(translateSelections(selections, 'skin'));
    if (bodyParts.length) parts.push(bodyParts.join(', '));

    const outfitParts = []
      .concat(translateSelections(selections, 'outfit'))
      .concat(translateSelections(selections, 'top'))
      .concat(translateSelections(selections, 'bottom'))
      .concat(translateSelections(selections, 'shoes'))
      .concat(translateSelections(selections, 'accessories'));
    if (outfitParts.length) parts.push(outfitParts.join(', '));

    const sceneParts = []
      .concat(translateSelections(selections, 'location-indoor'))
      .concat(translateSelections(selections, 'location-outdoor'))
      .concat(translateSelections(selections, 'location-special'))
      .concat(translateSelections(selections, 'time'))
      .concat(translateSelections(selections, 'weather'))
      .concat(translateSelections(selections, 'mood'))
      .concat(translateSelections(selections, 'lighting'))
      .concat(translateSelections(selections, 'pose'))
      .concat(translateSelections(selections, 'action'))
      .concat(translateSelections(selections, 'shot'))
      .concat(translateSelections(selections, 'style'))
      .concat(translateSelections(selections, 'quality'));
    if (sceneParts.length) parts.push(sceneParts.join(', '));

    return parts.join(', ');
  }

  function buildSentencePrompt(selections, promptText) {
    const sentences = [];

    if (!hasAnySelections(selections)) {
      const normalizedPrompt = String(promptText || '').trim();
      if (!normalizedPrompt) {
        return '';
      }
      return '다음 요소를 포함한 장면입니다: ' + normalizedPrompt + '.';
    }

    const count = getSelections(selections, 'count')[0] || '';
    const countText = formatCount(count);
    const subjectDetails = []
      .concat(getSelections(selections, 'ethnicity'))
      .concat(getSelections(selections, 'age'))
      .concat(formatGender(getSelections(selections, 'gender')))
      .join(' ');

    if (countText || subjectDetails) {
      const subjectNoun = count === '2명' || count === '소그룹' || count === '다수' ? '인물들' : '인물';
      const subjectPhrase = [countText, subjectDetails, subjectNoun].filter(Boolean).join(' ');
      sentences.push(subjectPhrase + '입니다.');
    }

    const hairDetails = [];
    const hairColors = getSelections(selections, 'hair-color');
    if (hairColors.length) hairDetails.push(formatList(hairColors) + ' 컬러');
    hairDetails.push.apply(hairDetails, getSelections(selections, 'hair-length'));
    hairDetails.push.apply(hairDetails, getSelections(selections, 'hair-style'));
    if (hairDetails.length) {
      sentences.push('헤어는 ' + formatList(hairDetails) + ' 요소로 표현합니다.');
    }

    const faceDetails = [];
    const faceShapes = getSelections(selections, 'face-shape');
    if (faceShapes.length) faceDetails.push(formatList(faceShapes) + ' 얼굴형');
    const faceImpressions = getSelections(selections, 'face-impression');
    if (faceImpressions.length) faceDetails.push(formatList(faceImpressions) + ' 인상');
    const eyes = getSelections(selections, 'eyes');
    if (eyes.length) faceDetails.push(formatList(eyes));
    const expressions = getSelections(selections, 'expression');
    if (expressions.length) faceDetails.push(formatList(expressions) + ' 표정');
    if (faceDetails.length) {
      sentences.push('얼굴은 ' + formatList(faceDetails) + '을 반영합니다.');
    }

    const bodyDetails = [];
    const bodyTypes = getSelections(selections, 'body-type');
    if (bodyTypes.length) bodyDetails.push(formatList(bodyTypes) + ' 체형');
    bodyDetails.push.apply(bodyDetails, getSelections(selections, 'height'));
    bodyDetails.push.apply(bodyDetails, getSelections(selections, 'skin'));
    if (bodyDetails.length) {
      sentences.push('체형과 피부 표현은 ' + formatList(bodyDetails) + ' 기준입니다.');
    }

    const outfitDetails = [];
    outfitDetails.push.apply(outfitDetails, getSelections(selections, 'outfit'));
    outfitDetails.push.apply(outfitDetails, getSelections(selections, 'top'));
    outfitDetails.push.apply(outfitDetails, getSelections(selections, 'bottom'));
    const shoes = getSelections(selections, 'shoes');
    if (shoes.length) outfitDetails.push(formatList(shoes));
    const accessories = getSelections(selections, 'accessories');
    if (accessories.length) outfitDetails.push(formatList(accessories) + ' 착용');
    if (outfitDetails.length) {
      sentences.push('의상은 ' + formatList(outfitDetails) + '으로 구성합니다.');
    }

    const locations = []
      .concat(getSelections(selections, 'location-indoor'))
      .concat(getSelections(selections, 'location-outdoor'))
      .concat(getSelections(selections, 'location-special'));
    const poses = getSelections(selections, 'pose');
    const actions = getSelections(selections, 'action');
    if (locations.length || poses.length || actions.length) {
      const sceneParts = [];
      if (locations.length) sceneParts.push(formatList(locations) + ' 배경');
      if (poses.length) sceneParts.push(formatList(poses) + ' 자세');
      if (actions.length) sceneParts.push(formatList(actions) + ' 동작');
      sentences.push('장면은 ' + formatList(sceneParts) + ' 중심으로 설정합니다.');
    }

    const timeWeather = []
      .concat(getSelections(selections, 'time'))
      .concat(getSelections(selections, 'weather'));
    if (timeWeather.length) {
      sentences.push('시간과 계절감은 ' + formatList(timeWeather) + ' 기준으로 잡습니다.');
    }

    const moods = getSelections(selections, 'mood');
    const lightings = getSelections(selections, 'lighting');
    if (moods.length || lightings.length) {
      const atmosphereParts = [];
      if (moods.length) atmosphereParts.push(formatList(moods) + ' 분위기');
      if (lightings.length) atmosphereParts.push(formatList(lightings) + ' 조명');
      sentences.push('전체 연출은 ' + formatList(atmosphereParts) + '으로 완성합니다.');
    }

    const cameraDetails = [];
    const shots = getSelections(selections, 'shot');
    const styles = getSelections(selections, 'style');
    const qualities = getSelections(selections, 'quality');
    if (shots.length) cameraDetails.push(formatList(shots) + ' 구도');
    if (styles.length) cameraDetails.push(formatList(styles) + ' 스타일');
    if (qualities.length) cameraDetails.push(formatList(qualities) + ' 품질');
    if (cameraDetails.length) {
      sentences.push('최종 출력은 ' + formatList(cameraDetails) + '로 마무리합니다.');
    }

    return sentences.join(' ');
  }

  global.PromptGeneratorCore = {
    buildPrompt,
    buildEnglishPrompt,
    buildSentencePrompt,
  };
})(window);
