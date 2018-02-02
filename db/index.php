<?php
require __DIR__ . '/RedBean/rb.php';

R::setup('sqlite:./database.db');

// freeze, if database is set up and first entries are stored!
// R::freeze(true);

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();
$app = new \Slim\Slim();

/**
 * get a list of entries
 */
$app->get('/list', function () use ($app) {

		$entries = R::findAll('entry', ' ORDER BY name ASC');

		$rows = array();
		foreach ($entries as $entry) 
		{
			$rows[] = array(
				'id' => $entry->id,
				'name' => $entry->name,
				'amount' => $entry->amount,
				'hash' => $entry->hash,
				'delete' => $entry->check,
				'check' => $entry->check
			);


			if ( $rows[sizeof($rows)-1]['delete'] == 0)
				unset( $rows[sizeof($rows)-1]['delete']);
		}

		$app->response->headers->set('Content-Type', 'application/json');
		$app->response->setBody(json_encode($rows));
	}
);
/**
 * Add one entry
 */
$app->post('/add', function () use ($app) {

		$response = array();
		$body = json_decode($app->request->getBody(), true);

		$name = filter_var($body['name'], FILTER_SANITIZE_STRING);
		$amount = (int)filter_var($body['amount'], FILTER_SANITIZE_STRING);
		$hash = sha1($name . $amount);

		//check if this entry already exists
		$existing = R::find('entry', 'hash = ?', array($hash));
		if (!$existing) {
			$newEntry = R::dispense('entry');
			$newEntry->hash = $hash;
			$newEntry->name = $name;
			$newEntry->amount = $amount;

			try {
				$id = R::store($newEntry);
				$response = array("id" => $id, "name" => $name, "amount" => $amount);
			} catch (Exception $e) {
				$response = array();
			}
		}

		$app->response->headers->set('Content-Type', 'application/json');
		$app->response->setBody(json_encode($response));
	}
);

$app->post('/delete', function () use ($app) {

		$json = json_decode($app->request->getBody(), TRUE);
		$todelete = $json['delete'];
		$response = array("status" => "ok");

		$entries = R::loadAll('entry', $todelete);
		if ($entries) {
			try {
				R::trashAll($entries);
			} catch (Exception $e) {
				$response["status"] = "fail";
			}
		}

		$app->response->headers->set('Content-Type', 'application/json');
		$app->response->setBody(json_encode($response));
	}
);

$app->post('/check', function () use ($app) {

		$json = json_decode($app->request->getBody(), TRUE);
		$todelete = $json['check'];
		$response = array("status" => "ok");

		$entries = R::loadAll('entry', $json['check'] );

		if ($entries) 
		{
			try 
			{
				foreach ($entries as $entry) 
				{
					if ( !$entry->check )
						$entry->check = true;
					else
						$entry->check = !$entry->check;

					R::store( $entry );
				}
				
			}
			catch (Exception $e) 
			{
				$response["status"] = "fail";
			}
		}
		
		$app->response->headers->set('Content-Type', 'application/json');
		$app->response->setBody(json_encode($response));
	}
);

	$app->get('/stream', function () use ($app) 
	{
		$app->response->headers->set('Content-Type', 'text/event-stream');

		$response = array("status" => "error");
	
		$checked=true;

		$entries = R::find('entry');

		$rows = array();
		foreach ($entries as $entry) 
		{
			if ( $entry->check==0 || $entry->check == null)
				continue;

			$rows[] = array(
				'id' => $entry->id,
				'name' => $entry->name,
				'amount' => $entry->amount,
				'hash' => $entry->hash,
				'check' => $entry->check
			);
		}
		
		if ( sizeof($rows) > 0 )
		{
			$app->response->setBody
			(
				'data: ' . json_encode($rows). "\n\n"
			);	
		}
	}
);
$app->run();