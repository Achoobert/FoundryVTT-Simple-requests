export function playSound(src = "modules/simple-requests/assets/request0.ogg") {
   const volume = game.settings.get("core", "globalInterfaceVolume");
   foundry.audio.AudioHelper.play({
      src,
      volume,
      autoplay: true,
      loop: false
   });
}
