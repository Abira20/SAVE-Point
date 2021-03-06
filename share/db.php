<?php

/* FIXME: This entire file needs to burn in a fire and be rewritten. */

//error_reporting(-1);

// Get connection details from environment variable
$urlp = parse_url($_ENV["DATABASE_URL"]);
// Build connection string for Postgres
$urls = "host={$urlp['host']} port={$urlp['port']} user={$urlp['user']} password={$urlp['pass']}  dbname=" . substr($urlp['path'], 1);

// Open connection
$dbconn = pg_connect($urls);

if ($dbconn === FALSE) {
    error_log(pg_last_error());
    error_log('Cannot connect to database.');    
    die();
};

function db_generic_error() {
    header('Location: /share/error/database_error.php');
}

function db_user() {
    return $_SESSION['username'];
}

function db_user_logged_in() {
    
    if (!isset($_SESSION['username']))
        return FALSE;
    if (db_is_demo_user($_SESSION['username']))
        return TRUE;
    
    $result = pg_query_params('SELECT COUNT(*) FROM users WHERE username=$1',
                              array($_SESSION['username']));
    
    if ($result === FALSE)
        return FALSE;
    else {
        
        $arr = pg_fetch_array($result);
        return ($arr[0] != 0);
    }  
}

function db_ensure_logged_in() {
    if (db_user_logged_in() === FALSE) {
        error_log("Not logged in");
        header('Location: /dashboard/users.php');        
        die();
    }
}

function db_user_details($user) {
    $result = pg_query_params('SELECT * FROM users WHERE username=$1', array($user));
    if ($result === FALSE)
        return FALSE;
    else {
        return pg_fetch_array($result);
    }
}


function db_user_is_instructor($user) {
    $user_info = db_user_details($user);
    if ($user_info === FALSE) return FALSE;
    $user_id = $user_info['id'];
    
    $result = pg_query_params('SELECT * FROM instructors WHERE user_id=$1', array($user_id));
    return (pg_num_rows($result) > 0);
}

function db_instructor_classes($user) {
    $user_info = db_user_details($user);
    if ($user_info === FALSE) return FALSE;
    $user_id = $user_info['id'];

    $result = pg_query_params('SELECT * FROM instructors i JOIN classes c on i.class_id = c.id WHERE i.user_id=$1',
                              array($user_id));
    if ($result === FALSE)
        return FALSE;
    else
        return pg_fetch_all($result);
}

function db_instructor_has_class($user, $class_id) {
    $result = db_instructor_classes($user);
    if ($result === FALSE)
        return FALSE;
    foreach ($result as $class) 
        if ($class['class_id'] == $class_id)
            return TRUE;
    
    return FALSE;
}

function db_instructor_report($game, $class_id) {
    $game = pg_escape_identifier($game . '_data');
    
    $result = pg_query_params('SELECT u.username, u.email, u.real_name, g.* FROM users u FULL OUTER JOIN ' . $game . ' g ON g.user_id = u.id WHERE u.class_id=$1', array($class_id));
    if ($result === FALSE) 
        return FALSE;
    $data = pg_fetch_all($result);
    return $data;
}

function db_user_register($user) {
    $user = array_merge(
        array(
            'user_type' => 'user'
        ), $user);
    
    return pg_query_params("INSERT INTO users (username, password, user_type, real_name, email, class_id) VALUES ($1, $2, $3, $4, $5, $6)", array(
        $user['username'],
        $user['password'],
        $user['user_type'],
        $user['real_name'],
        $user['email'],
        $user['class_id']
    ));
}

function db_kiosk_register_url() {
    return pg_query_params("INSERT INTO urls (date, url) VALUES ($1, $2)", array(
        date ("Y-m-d H:i:s"),
        "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]"
    ));
}

function db_store_param($param) {
    $res = pg_query_params("INSERT INTO params (param) VALUES ($1) RETURNING id", array($param));
    if ($res === FALSE)
        return FALSE;
    else {
        $row = pg_fetch_row($res);
        return $row[0];
    }
}

function db_get_param($id) {
    $res = pg_query_params("SELECT param FROM params WHERE id=$1", array($id));
    if ($res === FALSE)
        return FALSE;
    else {
        $row = pg_fetch_row($res);
        return $row[0];
    }
}

function db_get_classes() {
    $result = pg_query('SELECT * FROM classes ORDER BY class_name');
    if ($result === FALSE)
        return FALSE;
    else
        return pg_fetch_all($result);
}

function db_class_exists($class_name) {
    $classes = db_get_classes();
    if ($classes === FALSE) return FALSE;

    foreach($classes as $class)
        if ($class['class_name'] == $class_name) {
            return $class['id'];
        }
    return FALSE;
}


function db_get_game_data($game, $user) {
    $result = pg_query_params("SELECT mission_data FROM $1 WHERE user_id = $2", array($game, $user));
    if ($result === FALSE)
        return FALSE;
    $arr = pg_fetch_all($result);
    return $arr[0]['mission_data'];
}


function db_login($user, $password) {
    $_SESSION['username'] = $user;
    $_SESSION['password'] = $password;
    redirect_dashboard();
}


function db_is_demo_user($user) {
    $demo_users = array('demo', 'kiosk', 'instructor-demo');
    return in_array($user, $demo_users);
}

function db_is_kiosk_user() {
    return db_user() == 'kiosk';
}

function db_is_god_user() {
    return (db_user() == 'instructor-demo');
}

function db_is_admin_user() {
    return (db_user() == 'admin');
}

function db_check_special_user() {
    if (isset($_GET['login']) && db_is_demo_user($_GET['login'])) {
        session_unset();
        session_start();
        db_login($_GET['login']);
        header('Location: /dashboard/users.php');
        
        die();
    }
}



function redirect_alert($alert, $tab) {
    header('Location: users.php?alert=' . urlencode($alert) . "&show=" . urlencode($tab));
    die();
};

function redirect_dashboard() {
    header('Location: /dashboard/index.php');
    die();
}

function redirect_kiosk() {
    header('Location: /dashboard/index.php?login=kiosk');
    die();    
}

?>
