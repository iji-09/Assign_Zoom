let handPose;
let video;
let hands = [];
let drawing = [];
let showText = false;
let drawingColor = [0, 0, 0];
let lastPalmState = false;
let isThumbsUp = false;
let showThumbsUp = false;
let showHeart = false;
let isHeartGesture = false;

let buttons = [
  {
    x: 20, y: 100, w: 60, h: 60, label: "❤️",
    action: () => { buttons[0].drawUntil = millis() + 2000; },
    pressed: false, timer: 0, drawUntil: 0
  },
  {
    x: 20, y: 170, w: 60, h: 60, label: "👍",
    action: () => { buttons[1].drawUntil = millis() + 2000; },
    pressed: false, timer: 0, drawUntil: 0
  },
  {
    x: 20, y: 240, w: 60, h: 60, label: "📸",
    action: () => { buttons[2].drawUntil = millis() + 2000; },
    pressed: false, timer: 0, drawUntil: 0
  }
];

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, () => {
    console.log("📷 카메라 로드 완료!");
    handPose = ml5.handpose(video);
    handPose.on("predict", gotHands);
  });
  video.size(640, 480);
  video.hide();
}

function draw() {
  background(220);
  translate(width, 0);
  scale(-1, 1); // 비디오 반전
  image(video, 0, 0, width, height);

  // 그림 출력
  noFill();
  stroke(drawingColor);
  strokeWeight(4);
  for (let i = 1; i < drawing.length; i++) {
    line(drawing[i - 1].x, drawing[i - 1].y, drawing[i].x, drawing[i].y);
  }

  translate(width, 0);
  scale(-1, 1); // 다시 원상 복귀
  drawButtons();

  translate(width, 0);
  scale(-1, 1); // 다시 반전해서 손 분석

  let isDrawing = false;

  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
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

    // 버튼 충돌 감지
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
        if (!btn.pressed) {
          if (btn.timer === 0) {
            btn.timer = now;
          } else if (now - btn.timer > 2000) {
            btn.action(); // 실행
            btn.pressed = true;
            console.log(`${btn.label} 버튼 동작`);
          }
        }
      } else {
        btn.pressed = false;
        btn.timer = 0;
      }
    }

    // 제스처 감지 (화면에서 동시에 인식되는 경우)
    let isOnlyIndexUp =
      indexTip[1] < indexPIP[1] &&
      isBetween(middleTip, palmBase, middlePIP) &&
      isBetween(ringTip, palmBase, ringPIP) &&
      isBetween(pinkyTip, palmBase, pinkyPIP);
    if (isOnlyIndexUp) drawing = [];

    isHeartGesture =
      abs(thumbTip[0] - pinkyTip[0]) > 200 &&
      indexTip[1] > indexPIP[1] &&
      middleTip[1] > middlePIP[1] &&
      ringTip[1] > ringPIP[1];
    showHeart = isHeartGesture;

    let isVSign =
      indexTip[1] < indexPIP[1] &&
      middleTip[1] < middlePIP[1] &&
      isBetween(ringTip, palmBase, ringPIP) &&
      isBetween(pinkyTip, palmBase, pinkyPIP) &&
      abs(indexTip[0] - middleTip[0]) > 30;
    showText = isVSign;

    let isPalmOpen =
      indexTip[1] < indexPIP[1] &&
      middleTip[1] < middlePIP[1] &&
      ringTip[1] < ringPIP[1] &&
      pinkyTip[1] < pinkyPIP[1];

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

    if (isPalmOpen && !lastPalmState && !isDrawing) {
      drawingColor = [random(255), random(255), random(255)];
    }
    lastPalmState = isPalmOpen;

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

  let now = millis();

if (now < buttons[0].drawUntil) drawHeart();
if (now < buttons[1].drawUntil) drawThumbsUp();
if (now < buttons[2].drawUntil) drawKimchiText();


// 제스처로 인한 동작 (지속됨)
if (showHeart) drawHeart();
if (showThumbsUp) drawThumbsUp();
if (showText) drawKimchiText();

}

// ========= 보조 함수들 =========

function isBetween(tip, base1, base2) {
  return (tip[1] > base1[1] && tip[1] < base2[1]) || (tip[1] < base1[1] && tip[1] > base2[1]);
}

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
// 손 인식 결과 저장 (좌우 반전 적용)
function gotHands(results) {
  hands = results.map(hand => ({
    ...hand,
    landmarks: hand.landmarks.map(point => [width - point[0], point[1]])
  }));
}
