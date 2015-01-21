package server;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.SocketException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

import org.java_websocket.util.Base64;

import utilities.Log;

public class ClientThread implements Runnable {
	
	public static void main(String[] args) {
		System.out.println(new ClientThread(null, -1).keyHandshake("dGhlIHNhbXBsZSBub25jZQ=="));
	}
	
	private static final String END_OF_LINE = "\r\n";

	Socket clientSocket;
	final int mID;
	
	PrintWriter output = null;
	
	private boolean shouldDie = false;
	
	private boolean isAlive = true;
	
	public ClientThread(Socket socket, int id) {
		clientSocket = socket;
		mID = id;
		
		System.out.println("> New Client - " + mID);
	}
	
	protected void sendMessage(String msg) {
		if (isAlive) {
			Log.print("Client id " + mID + " is sending a message");
			output.write(1);
			output.write(msg + END_OF_LINE);
			output.flush();
		}
	}
	
	public boolean isClientAlive() {
		return isAlive;
	}
	
	public int getID() {
		return mID;
	}
	
	protected void closeClientThread() {
		shouldDie = true;
		
		try {
			closeSocket();
		} catch (IOException e) { e.printStackTrace(); }
	}
	
	private void closeSocket() throws IOException {
		isAlive = false;
		
		output.write(-1);
		clientSocket.close();
	}
	
	@Override
	public void run() {
		try {
			
			// Create the streams
			output = new PrintWriter(clientSocket.getOutputStream(), true);
			BufferedReader input = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
			
			// Tell the client that they've connected
			output.println("You have connected at: " + new Date());
			
			//doHandshake(input);
			
			// Loop that runs the functions
			while (!shouldDie) {
				
				try {
					// This will wait until a line of text has been sent
					String chatInput = input.readLine();
					
					if (chatInput == null || chatInput.equals("CLOSE_SOCKET")) {
						System.out.println("Client requested close");
						closeSocket();
						break;
					}
					
					output.write(0);
					output.flush();
					
					System.out.println(mID + " >> " + chatInput);
					
					
				} catch (SocketException e) { }
				
			}
		
		
		} catch (IOException e) {
			e.printStackTrace();
		}
	
		System.out.println("> Exiting thread - " + mID);
	}
	
	private void doHandshake(BufferedReader input) throws IOException {
		String response = "";
		
		String clientKey;
		while (!(clientKey = input.readLine()).startsWith("Sec-WebSocket-Key")) {
			;
		}
		
		clientKey = clientKey.split(" ")[1];
		
		String acceptKey = keyHandshake(clientKey);
		
		//StringBuilder sBuilder = new StringBuilder();
		
		response += "HTTP/1.1 101 Switching Protocols";
		response += END_OF_LINE;
		response += "Upgrade: websocket";
		response += END_OF_LINE;
		response += "Connection: Upgrade";
		response += END_OF_LINE;
		
		response += "Sec-WebSocket-Accept: ";
		response += acceptKey;
		response += END_OF_LINE;
		response += END_OF_LINE;
		
		//sBuilder.append("HTTP/1.1 101 Switching Protocols");
		//sBuilder.append(END_OF_LINE);
		//sBuilder.append("Upgrade: websocket");
		//sBuilder.append(END_OF_LINE);
		//sBuilder.append("Connection: Upgrade");
		//sBuilder.append(END_OF_LINE);
		
		//sBuilder.append("Sec-WebSocket-Accept: ");
		//sBuilder.append(acceptKey);
		//sBuilder.append(END_OF_LINE);
		//sBuilder.append(END_OF_LINE);
		
		//System.out.println("\n\n" + sBuilder.toString());
		
		output.write(response);
		output.flush();
	}
	
	private String keyHandshake(String clientKey) {
		clientKey += "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
		
		MessageDigest md = null;
		try {
			md = MessageDigest.getInstance("SHA-1");
		} catch (NoSuchAlgorithmException e) {
			e.printStackTrace();
		}
		
		
		return Base64.encodeBytes(md.digest(clientKey.getBytes()));
	}
	
	/*
	private String byteArrayToHexString(byte[] b) {
		  String result = "";
		  for (int i=0; i < b.length; i++) {
		    result +=
		          Integer.toString( ( b[i] & 0xff ) + 0x100, 16).substring( 1 );
		  }
		  return result;
		}
	*/

}
