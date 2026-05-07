<?php
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: Content-Type');

  include_once("db.func.php");
  
  $postData = file_get_contents('php://input');
  $req = json_decode($postData, true);
  $response = getResponse($req);
  echo json_encode($response);
    
  function getResponse($req) {
    	if (!isset($req['action'])) return [];
    	switch ($req['action']) {
    		case 'current': return isset($req['current_date']) ? pl_last($req['current_date'], false) : pl_last("", false); break;
    		case 'latest': return pl_last(); break;
    		case 'get': return isset($req['pl_date']) ? pl_get($req['pl_date']) : ['error' => 'No playlist date specified']; break;
    		case 'prev': return isset($req['pl_date']) ? pl_next($req['pl_date'], true) : ['error' => 'No playlist date specified']; break;
    		case 'next': return isset($req['pl_date']) ? pl_next($req['pl_date']) : ['error' => 'No playlist date specified']; break;
    		case 'top100': return isset($req['year']) ? pl_top100($req['year']) : ['error' => 'No year specified']; break;
    		case 'top10artists': return isset($req['year']) ? pl_top10artists($req['year']) : ['error' => 'No year specified']; break;
			case 'upload': return isset($req['data']) ? pl_upload($req['data']) : ['error' => 'No playlist data specified']; break;
			case 'delete': return isset($req['pl_date']) && isset($req['password']) ? pl_delete($req['pl_date'], $req['password']) :
    		['error' => 'No playlist date or password specified']; break;
    		default: return [];
    	}
    	return [];
  }
    
?>