package server;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import utilities.Log;

public class ConnectionListenerThread implements Runnable {
	
	protected boolean killServer = false;

	private int clientID = 0;
	
	private final List<ClientThread> connectedThreads = new ArrayList<ClientThread>();
	
	protected void broadcast(String msg) {
		for (ClientThread ct : connectedThreads) {
			ct.sendMessage(msg);
		}
	}
	
	@Override
	public void run() {
		
		Log.print("ConnectionListenerThread created");
		
		ServerSocket sSocket = null;
		
		try {
			sSocket = new ServerSocket(5000);
			sSocket.setSoTimeout(500);
			
			Log.print("Server started at: " + new Date());
			
			// Loop forever and serve anybody
			while (!killServer) {
			
				try {
					// Wait for a new client to connect
					Socket socket = sSocket.accept();
					
					// Create a new thread to handle the connection
					ClientThread cT = new ClientThread(socket, (clientID++));
					
					// Start the thread
					Thread thread = new Thread(cT);
					thread.start();
					
					connectedThreads.add(cT);
				
				} catch (SocketTimeoutException e) {
				}
			}
			
			for (ClientThread leftover : connectedThreads) {
				if (leftover.isClientAlive()) {
					Log.print("Attempting to close " + leftover.getID());
					leftover.closeClientThread();
				}
			}
			
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			if (sSocket != null) {
				try {
					sSocket.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
	}
}
