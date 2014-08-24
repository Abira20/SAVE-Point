<?php
require('../../share/startup.php');

$cfg = init();
write_header($cfg);
write_cfg_json($cfg);
write_mission_rules($cfg);
?>

<?php write_js_requires($cfg); ?>

<div id="app">
  <div id="sidebar">
    <div id="menu" class="btn-jrs-ico fa fa-bars"></div>
    <div class="sidebar-section">Missions<div class="separator"></div></div>
    <div id="missions">
      <div class="mission-completed">
        <div class="mission-symbol"></div>
        <div class="mission-label">Circular</div>
        <div class="clear"></div>
      </div>
      <div class="mission-completed">
        <div class="mission-symbol"></div>
        <div class="mission-label">Elliptical</div>
        <div class="clear"></div>        
      </div>
      <div class="mission-completed">
        <div class="mission-symbol"></div>
        <div class="mission-label">Mission #3</div>
        <div class="clear"></div>        
      </div>
      <div class="mission-active">
        <div class="mission-symbol"></div>
        <div class="mission-label">Mission #4
          </div>
          <div class="clear"></div>
      </div>
      <div class="mission">
        <div class="mission-symbol"></div>
        <div class="mission-label">Hello!</div>
        <div class="clear"></div>        
      </div>
    </div>
    <div class="sidebar-section">Tools<div class="separator"></div></div>
    <div class="sidebar-expandable">
      <button class="btn btn-lg btn-jrs " onClick="app.reset()">Restart mission</button>
    </div>
  </div>

  <div id="canvas-container">
    <canvas id="canvas" resize keepalive="true"></canvas>
  </div>
  <div id="info-top">
    <div id="info-table-container">
    <table cols="2">
      <tr>
        <td class="td-label">Distance</td>
        <td class="td-val" id="distance"></td>
      </tr>
      <tr>
        <td class="td-label">Speed</td>
        <td class="td-val" id="speed"></td>
      </tr>
      <tr>
        <td class="td-label">Time</td>
        <td class="td-val" id="time"></td>
      </tr>
    </table>
    </div>
    <div id="info-help">
    </div>
  </div>
  

  <div id="help-text" class="expanded animated">
    <div id="help-body">
    </div>
  </div>

  <div class="btn-jrs-ico fa fa-question-circle" id="help"></div>
</div>

<script type="text/javascript" src="../share/js/init.js"></script>
<script type="text/javascript" src="./js/app.js"></script>
<script type="text/paperscript" canvas="canvas" src="./js/draw.js"></script>

<?php write_footer($cfg); ?>
