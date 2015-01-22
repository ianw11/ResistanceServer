package client;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.SocketException;
import java.util.Scanner;

public class Client {
	
	Scanner scanner = null;
	Socket socket = null;
	BufferedReader input = null;
	
	private boolean isSocketOpen = false;

	public static void main(String[] args) {
	   if (args.length != 1) {
	      System.out.println("Usage: java Client <server>");
        	System.out.println("Defaulting to localhost");
        	new Client("localhost");
      }
		else
			new Client(args[0]);
	}

	public Client(String server) {
		go(server);
	}
	
	private void go(String server) {
		// Set up a scanner for keyboard input
		scanner = new Scanner(System.in);
		
		System.out.println("What is your username? ");
		String username = scanner.nextLine();
		System.out.println("Please wait, connecting....");
		
		// Writing to the server
		PrintWriter output = null;
		
		try {
			// Connect to the server
			socket = new Socket(server, 5000);
			
			// Open the output (writing to server)
			output = new PrintWriter(socket.getOutputStream(), true);
			// And input (reading from server)
			input = new BufferedReader(new InputStreamReader(socket.getInputStream()));
			
			// This needs to be on for the socket reader to read at all
			isSocketOpen = true;
			
			// Send the opening message with username
			output.println(username);
			
			// Wait for the server to tell the client a connection has been made
			String connectionMessage = input.readLine();
			System.out.println(connectionMessage);
			
			// Launch the thread asynchronously to handle data from the server
			new Thread(new SocketReaderThread()).start();
			
			
			// The actual code to handle keyboard input to the server
			while (isSocketOpen) {
				String keyboardInput = scanner.nextLine();
				
				// If the server shut down while blocked for input, check again
				if (isSocketOpen) {
				
					if (keyboardInput.isEmpty()) {
						isSocketOpen = false;
						output.println("CLOSE_SOCKET");
						break;
					}
					
					if (keyboardInput.equals("CLOSE_SOCKET"))
					   System.err.println("Illegal message");
					else if (keyboardInput.length() > 1024)
					   System.err.println("Message too long. Max 1024 chars");
					else
					   // Send the text
					   output.println(keyboardInput);
				}
			}
			
			
			
		} catch (SocketException e) {
			System.err.println(e.getMessage());
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			if (scanner != null) {
				scanner.close();
			}
			
			if (output != null) {
				output.close();
			}
			
			if (input != null) {
				try {
					input.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
			
			if (socket != null) {
				try {
					socket.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
		
		System.out.println("Client closed");
	}
	
	protected class SocketReaderThread implements Runnable {
		
		@Override
		public void run() {
			char[] buffer = new char[1024];
			
			try {
				while (isSocketOpen) {
					int event = input.read();
					
					//System.out.println("Event: " + event);
					
					if (event == 1) {
						int numRead = input.read(buffer, 0, 1024);
						//System.out.println("BROADCAST: " + numRead);

						for (int i = 0; i < numRead; ++i)
							System.out.print(buffer[i]);

					}
					
					else if (event == -1) {
						isSocketOpen = false;
						System.out.println("!!> Server has shutdown. Press Enter to continue.");
						
						input.close();
						input = null;
						
						socket.close();
						socket = null;
						
						scanner.close();
						scanner = null;
					}
				}
			} catch (IOException e) {
				if (isSocketOpen)
					e.printStackTrace();
			}
		}
	}
	
}
