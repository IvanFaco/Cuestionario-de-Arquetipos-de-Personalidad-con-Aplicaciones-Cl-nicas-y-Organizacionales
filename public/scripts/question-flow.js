(function () {
  const positions = ["10%", "30%", "50%", "70%", "90%"];
  const root = document.querySelector("[data-question-flow]");
  const nextButton = document.querySelector("[data-next-button]");
  const selectedBubble = document.querySelector("[data-selected-bubble]");
  const selectedBubbleIcon = document.querySelector("[data-selected-bubble-icon]");
  const selectionLabel = document.querySelector(".question-card-panel__selection-label");
  const selectionValue = document.querySelector(".question-card-panel__selection-value");

  if (!root || !nextButton || !selectedBubble || !selectedBubbleIcon) {
    return;
  }

  const bubbleClasses = ["bubble-x", "bubble-down", "bubble-neutral", "bubble-up", "bubble-fire"];
  const labelItems = Array.from(document.querySelectorAll("[data-label-item]"));
  const answerInputs = Array.from(document.querySelectorAll("[data-answer-input]"));
  let hasVisibleSelection = answerInputs.some((input) => input.checked);

  function playEntryAnimation() {
    selectedBubble.classList.remove("is-entering");
    void selectedBubble.offsetWidth;
    selectedBubble.classList.add("is-entering");
  }

  function setSelection(input) {
    const answerLabel = input.dataset.answerLabel ?? "";
    const answerEmoji = input.dataset.answerEmoji ?? "";
    const answerIndex = Number.parseInt(input.dataset.answerIndex ?? "-1", 10);

    selectionLabel.textContent = "Elegiste:";
    selectionValue.textContent = answerLabel;

    answerInputs.forEach((item) => {
      item.parentElement?.classList.toggle("selected", item === input);
    });

    labelItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.labelIndex === String(answerIndex));
    });

    selectedBubble.classList.remove("is-hidden", ...bubbleClasses);
    if (answerIndex >= 0 && answerIndex < bubbleClasses.length) {
      selectedBubble.classList.add(bubbleClasses[answerIndex]);
      selectedBubble.style.left = positions[answerIndex];
    }
    selectedBubbleIcon.textContent = answerEmoji;

    if (!hasVisibleSelection) {
      playEntryAnimation();
      hasVisibleSelection = true;
    }
  }

  answerInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (input.checked) {
        setSelection(input);
      }
    });
  });

  const selectedInput = answerInputs.find((input) => input.checked);
  if (selectedInput) {
    setSelection(selectedInput);
  }

  selectedBubble.addEventListener("animationend", function () {
    selectedBubble.classList.remove("is-entering");
  });
})();
