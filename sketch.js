// handpose 모델 객체
let handPose;
// 비디오 캡처 객체
let video;
// 인식된 손 정보를 담는 배열
let hands = [];
// 그려진 선들을 저장하는 배열
let drawing = [];
// '김치~' 텍스트 표시 여부
let showText = false;
// 현재 그리기 색상
let drawingColor = [0, 0, 0];
// 손바닥 펼침 상태 저장
let lastPalmState = false;
// 엄지척 제스처 여부
let isThumbsUp = false;
// 엄지척 표시 여부
let showThumbsUp = false;
// 하트 제스처 여부
let showHeart = false;
let isHeartGesture = false;

// 버튼 객체들 (하트, 엄지척, 김치~)
let buttons = [
  {
    x: 20, y: 100, w: 60, h: 60, label: "❤️",
    action: () => { buttons[0].drawUntil = millis() + 2000; }, // 2초간 하트 표시
    pressed: false, timer: 0, drawUntil: 0
  },
  {
    x: 20, y: 170, w: 60, h: 60, label: "👍",
    action: () => { buttons[1].drawUntil = millis() + 2000; }, // 2초간 엄지척 표시
    pressed: false, timer: 0, drawUntil: 0
  },
  {
    x: 20, y: 240, w: 60, h: 60, label: "📸",
    action: () => { buttons[2].drawUntil = millis() + 2000; }, // 2초간 김치~ 표시
    pressed: false, timer: 0, drawUntil: 0
  }
];

function setup() {
  createCanvas(640, 480);
  // 비디오 설정 및 handpose 모델 불러오기
  video = createCapture(VIDEO, () => {
    console.log("📷 카메라 로드 완료!");
    handPose = ml5.handpose(video); // 모델 불러오기
    handPose.on("predict", gotHands); // 손 예측 결과 이벤트 등록
  });
  video.size(640, 480);
  video.hide(); // 비디오 숨김 (캔버스에 직접 그림)
}

function draw() {
  background(220);

  // 비디오 좌우 반전
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);

  // 이전에 그린 선들 표시
  noFill();
  stroke(drawingColor);
  strokeWeight(4);
  for (let i = 1; i < drawing.length; i++) {
    line(drawing[i - 1].x, drawing[i - 1].y, drawing[i].x, drawing[i].y);
  }

  // 버튼 표시
  translate(width, 0);
  scale(-1, 1);
  drawButtons();

  // 손 좌표 분석을 위한 좌우 반전 다시 적용
  translate(width, 0);
  scale(-1, 1);

  let isDrawing = false;

  // 손 분석
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    // 손의 주요 랜드마크
    let palmBase = hand.landmarks[0];
    let thumbIP = hand.landmarks[3];
    let thumbTip = hand.landmarks[4];
    let indexPIP = hand.landmarks[6];
    let indexTip = hand.landmarks[8];
    let middlePIP = hand.landmarks[10];
    let middleTip = hand.landmarks[12];
    let ringPIP = hand.landmarks[14];
    let ringTip = hand.landmarks[16];
    let pinkyPIP = hand.landmarks[18];
    let pinkyTip = hand.landmarks[20];

    // 버튼 충돌 체크
    for (let b = 0; b < buttons.length; b++) {
      let btn = buttons[b];
      let left = width - btn.x - btn.w;
      let right = width - btn.x;
      let top = btn.y;
      let bottom = btn.y + btn.h;
      let now = millis();

      if (
        indexTip[0] > left &&
        indexTip[0] < right &&
        indexTip[1] > top &&
        indexTip[1] < bottom
      ) {
        // 버튼 위에 손가락이 2초 이상 있으면
        if (!btn.pressed) {
          if (btn.timer === 0) {
            btn.timer = now;
          } else if (now - btn.timer > 2000) {
            btn.action(); // 해당 기능 실행
            btn.pressed = true;
            console.log(`${btn.label} 버튼 동작`);
          }
        }
      } else {
        // 벗어나면 초기화
        btn.pressed = false;
        btn.timer = 0;
      }
    }

    // 제스처 1: 검지만 펴면 그림 지움
    let isOnlyIndexUp =
      indexTip[1] < indexPIP[1] &&
      isBetween(middleTip, palmBase, middlePIP) &&
      isBetween(ringTip, palmBase, ringPIP) &&
      isBetween(pinkyTip, palmBase, pinkyPIP);
    if (isOnlyIndexUp) drawing = [];

    // 제스처 2: 하트 (엄지-새끼 손가락 거리 넓고, 나머지 손가락은 접혀 있음)
    isHeartGesture =
      abs(thumbTip[0] - pinkyTip[0]) > 200 &&
      indexTip[1] > indexPIP[1] &&
      middleTip[1] > middlePIP[1] &&
      ringTip[1] > ringPIP[1];
    showHeart = isHeartGesture;

    // 제스처 3: 브이 (김치~ 텍스트)
    let isVSign =
      indexTip[1] < indexPIP[1] &&
      middleTip[1] < middlePIP[1] &&
      isBetween(ringTip, palmBase, ringPIP) &&
      isBetween(pinkyTip, palmBase, pinkyPIP) &&
      abs(indexTip[0] - middleTip[0]) > 30;
    showText = isVSign;

    // 제스처 4: 손바닥 펼침 (색상 변경)
    let isPalmOpen =
      indexTip[1] < indexPIP[1] &&
      middleTip[1] < middlePIP[1] &&
      ringTip[1] < ringPIP[1] &&
      pinkyTip[1] < pinkyPIP[1];

    // 제스처 5: 엄지척
    let thumbIsVertical = abs(thumbTip[0] - thumbIP[0]) < 20;
    let fingersAreHorizontal =
      abs(indexTip[0] - indexPIP[0]) > 10 &&
      abs(middleTip[0] - middlePIP[0]) > 10 &&
      abs(ringTip[0] - ringPIP[0]) > 10 &&
      abs(pinkyTip[0] - pinkyPIP[0]) > 10;

    isThumbsUp =
      thumbTip[1] < indexTip[1] &&
      thumbTip[1] < middleTip[1] &&
      thumbTip[1] < ringTip[1] &&
      thumbTip[1] < pinkyTip[1] &&
      thumbTip[1] < thumbIP[1] &&
      isBetween(indexTip, palmBase, indexPIP) &&
      isBetween(middleTip, palmBase, middlePIP) &&
      isBetween(ringTip, palmBase, ringPIP) &&
      isBetween(pinkyTip, palmBase, pinkyPIP) &&
      thumbIsVertical &&
      fingersAreHorizontal;
    showThumbsUp = isThumbsUp;

    // 색상 바꾸기 (손바닥 펼침 상태 변화 감지)
    if (isPalmOpen && !lastPalmState && !isDrawing) {
      drawingColor = [random(255), random(255), random(255)];
    }
    lastPalmState = isPalmOpen;

    // 그리기 동작 감지 (손가락 가까이 모음)
    let distance = dist(indexTip[0], indexTip[1], thumbTip[0], thumbTip[1]);
    isDrawing =
      distance < 20 &&
      middleTip[1] < indexTip[1] &&
      ringTip[1] < indexTip[1] &&
      pinkyTip[1] < indexTip[1];

    if (isDrawing) {
      drawing.push({ x: width - indexTip[0], y: indexTip[1] });
    }
  }

  // 버튼으로 실행된 기능: 시간 제한 2초
  let now = millis();
  if (now < buttons[0].drawUntil) drawHeart();
  if (now < buttons[1].drawUntil) drawThumbsUp();
  if (now < buttons[2].drawUntil) drawKimchiText();

  // 제스처로 실행된 기능 (지속 표시)
  if (showHeart) drawHeart();
  if (showThumbsUp) drawThumbsUp();
  if (showText) drawKimchiText();
}

// === 보조 함수들 ===

// 두 점 사이에 있는지 여부
function isBetween(tip, base1, base2) {
  return (tip[1] > base1[1] && tip[1] < base2[1]) || (tip[1] < base1[1] && tip[1] > base2[1]);
}

// 버튼 UI 그리기
function drawButtons() {
  push();
  translate(width, 0);
  scale(-1, 1);
  for (let btn of buttons) {
    fill(btn.pressed ? 180 : 240);
    stroke(0);
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
  pop();
}

// 김치~ 텍스트 표시
function drawKimchiText() {
  push();
  translate(width, 0);
  scale(-1, 1);
  textSize(60);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  stroke(0);
  strokeWeight(15);
  fill(255);
  text("김치~", width / 2, height / 2);
  pop();
}

// 엄지척 표시
function drawThumbsUp() {
  push();
  translate(width, 0);
  scale(-1, 1);
  textSize(90);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  stroke(0);
  strokeWeight(15);
  fill(255);
  text("👍", width / 2, height / 6);
  pop();
}

// 하트 표시
function drawHeart() {
  push();
  translate(width, 0);
  scale(-1, 1);
  textSize(60);
  textAlign(RIGHT, BOTTOM);
  textStyle(BOLD);
  stroke(0);
  strokeWeight(10);
  fill(255, 0, 100);
  text("❤️", width - 20, height - 20);
  pop();
}

// 손 인식 결과 반영 (좌우 반전 포함)
function gotHands(results) {
  hands = results.map(hand => ({
    ...hand,
    landmarks: hand.landmarks.map(point => [width - point[0], point[1]])
  }));
}
