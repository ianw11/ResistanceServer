package server;

import java.util.Scanner;

import utilities.Log;

public class Server {
	
	private boolean killServer = false;
	
	public static void main(String[] args) {
		new Server();
	}
	
	public Server() {
		
		// Set up the listener for new connections
		ConnectionListenerThread connectionListener = new ConnectionListenerThread();
		Thread connectionListenerThread = new Thread(connectionListener);
		connectionListenerThread.start();
		
		// Let it complete before moving on
		// No reason why, just because I feel like it
		while (!connectionListenerThread.isAlive())
			;
		
		// Start the thread that handles command line input
		Thread inputListener = new Thread(new ConsoleReaderThread(connectionListener));
		inputListener.start();
		
		try {
			inputListener.join();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		
		Log.print("Input Listener closed");
		
		try {
			connectionListener.killServer = true;
			connectionListenerThread.join();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		
		Log.print("Connection Listener closed");
		
		Log.print("Server shutdown complete");
		
	}
	
	protected class ConsoleReaderThread implements Runnable {
		
		private final ConnectionListenerThread clt;
		
		public ConsoleReaderThread(ConnectionListenerThread connections) {
			clt = connections;
		}
		
		@Override
		public void run() {
			
			Scanner scanner = new Scanner(System.in);
			
			Log.print("Initialized.  Enter 'help' to see commands");
			
			while (!killServer) {
				System.out.print("$ ");
				String input = scanner.nextLine();
				if (input.equals("quit"))
					killServer = true;
				else {
					String[] split = input.split(" ");
					if (split[0].equals("b")) {
						StringBuilder message = new StringBuilder();
						for (int i = 1; i < split.length; ++i) {
							message.append(split[i] + " ");
						}
						
						Log.print("Broadcasting: " + message.toString());
						clt.broadcast(message.toString());
					}
					else if (split[0].equals("help")) {
						Log.print("'quit' to quit\n'b' to broadcast\n'show' to show connections\n'help' to open this dialog");
					}
					else if (split[0].equals("show")) {
						Log.print("TODO SHow connected users");
					}
				}
			}
			
			scanner.close();
		}
		
	}

}
