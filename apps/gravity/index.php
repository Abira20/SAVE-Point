<?php
require($_SERVER['DOCUMENT_ROOT'] . '/../share/startup.php');
require('db.php');
db_ensure_logged_in();

$cfg = init();
write_header($cfg);
write_cfg_json($cfg);
write_mission_rules($cfg);
?>

<?php write_js_requires($cfg); ?>

<script>
 LOGGED_USER='<?= db_user(); ?>';
 APP_CFG.map = <?= json_encode(spyc_load_file("./map.yaml")); ?>;
</script>
<style>
 body, html {
   overflow:hidden;
 }
</style>

<div id="app-modal" class="full-size" style="display:none">
  Hello!
</div>


<div id="app" class="full-size">
  <div id="text-top" class="animated">
    Welcome!
  </div>
  
  
  <div id="canvas-container" class="full-size">
    
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
          <tr>
            <td class="td-stars" colspan="2">
              <div id="stars">
              </div>
            </td>
          </tr>
        </table>
      </div>
      <div id="toolbars">
        <div class="toolbar in-front hidden" id="toolbar-zoom">
          Zoom: <strong><span id="zoom-value">100</span>%</strong>
          <span class="pull-right">
            <span class="btn-group">
              <button class="btn-jrs in-front fa fa-plus" id="zoom-in"></button>
              <button class="btn-jrs in-front fa fa-minus" id="zoom-out"></button>
            </span>
            <span class="fa fa-minus-circle btn-borderless" id="zoom-close"></span>
          </span>
        </div>
      </div>
      
    </div>
    <canvas id="canvas" resize keepalive="true" style="position:absolute"></canvas>
  </div>

  <div id="sidebar">
    <div class="mobile-only">
      <div class="sidebar-item">
        <button id="menu" class="btn-jrs-ico fa fa-bars"></button>
      </div>
      <div class="separator-center"></div>
    </div>
    
    <div class="sidebar-item">
      <button id="missions" class="btn-jrs-ico fa fa-th-large" title="Mission menu" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Mission menu</div>
    </div>
    <div class="sidebar-item">
      <button id="reset" class="btn-jrs-ico fa fa-undo"  title="Restart mission" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Restart mission</div>
    </div>
    <div class="sidebar-item">
      <button class="settings btn-jrs-ico fa fa-sliders"  title="Settings" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Game settings</div>
    </div>
    <div class="sidebar-item">
      <button id="dashboard" class="btn-jrs-ico fa fa-backward" title="Back to Dashboard" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Back to dashboard</div>
    </div>
    <div class="sidebar-item">
      <button id="help" class="btn-jrs-ico fa fa-question-circle" title="Help" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Help</div>
    </div>

    <div class="separator-center"></div>
    <div class="sidebar-item sidebar-item-disabled" id="sidebar-sizes">
      <button id="sizes" class="btn-jrs-ico fa fa-arrows-alt"  title="Toggle physical size" data-uk-tooltip="{pos: 'right', offset:20}"></button>
      <div class="sidebar-title">Toggle physical size</div>
    </div>
    <div class="sidebar-item sidebar-item-disabled"  title="Zoom" data-uk-tooltip="{pos: 'right', offset:20}" id="sidebar-zoom">
      <button id="zoom" class="btn-jrs-ico fa fa-search"></button>
      <div class="sidebar-title">Zoom</div>
    </div>
  </div>

  

  <div id="help-text" class="animated">
    <div id="help-body">
    </div>
  </div>


</div>

<div id="app-message" style="display:none">
  <div id="app-message-container">
    <div id="app-message-body">
      
    </div>
    <div id="app-message-close" class="btn-jrs-ico fa fa-close" onClick="$('#app-message').hide();"></div>
  </div>
</div>


<div id="app-menu" class="animated">
  <div id="app-menu-map-container">
    <div id="app-menu-world">
      <span id="app-menu-world-name">Hello!</span>
      <div class="float-right">
        <span class="icon-win-star color-accent"></span>&times;<span id="app-menu-stars-earned">20</span>
      </div>
    </div>
    <div id="app-menu-map">
      
    </div>
  </div>
  <div id="app-menu-text">
    <button class="settings btn-jrs-ico fa fa-sliders"  title="Settings" data-uk-tooltip="{pos: 'bottom', offset:20}"></button>
    <div id="app-menu-text-top">
      <div id="app-menu-mission-title" class="title"></div>
      <div id="app-menu-mission-subtitle" class="subtitle"></div>
      <div id="app-menu-mission-stars"></div>
      <div class="clear"></div>
    </div>
    <div class="bubble-cont">
      <img src="img/boss.gif" width="150" class="bubble-avatar">
      <div class="bubble">
        <div id="bubble-text">
        </div>
        <button id="app-menu-start" class="btn-jrs">
          Play
        </button>

      </div>
    </div>
    <div id="app-menu-start-container">
    </div>
  </div>
  <div id="my-id" class="uk-offcanvas">
    <div class="uk-offcanvas-bar">
      Hello!!
    </div>
  </div>
</div>

<script type="text/javascript" src="../share/js/init.js"></script>
<script type="text/javascript" src="js/app.js"></script>
<script type="text/javascript" src="js/templates.js"></script>
<script type="text/javascript" src="js/map.js"></script>
<script type="text/javascript" src="js/single-choice.js"></script>
<script type="text/javascript" src="js/speech.js"></script>
<script type="text/javascript" src="js/ui.js"></script>
<script type="text/javascript" src="js/debug.js"></script>

<script type="text/paperscript" canvas="canvas" src="js/draw.js"></script>

<!-- Templates -->

<?php write_footer($cfg); ?>
